import {
	RadiantElement,
	customElement,
	onEvent,
	onUpdated,
	prop,
	registerSsrPreparationCallback,
} from '@ecopages/radiant';
import { consumeContext, onContextUpdate, provideContext } from '@ecopages/radiant/context';
import type { ContextProvider } from '@ecopages/radiant/context';
import {
	findFieldControl,
	findFieldDescription,
	findFieldError,
	findFieldErrorElements,
	findFieldLabel,
	getAriaControlTargets,
	isNativeTextControl,
	isPrimaryFieldControlEvent,
	readControlValue,
	FIELD_CONTROL_SELECTOR,
	RUI_FIELD_DEFAULT_VALUE_ATTR,
	RUI_FIELD_MANAGED_ATTR,
	writeControlValue,
	wireFieldControlName,
} from '../form/control-protocol';
import { formContext, type FormContextValue } from '../form/form-context';
import { fieldContext, type FieldContextValue } from './field-context';
import type { FieldRules } from '../form/types';
import { bindVisibleLabel } from '../shared/field-label';
import { uniqueId } from '@/lib/unique-id';

/**
 * The JSON-safe subset of `FieldRules` for SSR hydration — a `validate` function can't
 * survive serialization and is dropped, same as any function crossing that boundary.
 */
function stripValidate(rules: FieldRules | undefined): Omit<FieldRules, 'validate'> | undefined {
	if (!rules) {
		return undefined;
	}
	const { validate: _validate, ...serializable } = rules;
	return serializable;
}

export type RuiFieldProps = {
	name: string;
	rules?: FieldRules;
	defaultValue?: unknown;
	defaultValueData?: string;
	disabled?: boolean;
	/** Standalone error message when not using a form provider. */
	error?: string;
	/** Standalone invalid flag when not using a form provider. */
	invalid?: boolean;
};

/**
 * `<rui-field>` — connector between composed controls and an ancestor `<rui-form>`.
 *
 * The custom element is a behavior host: it queries authored light-DOM children,
 * registers with the form via {@link formContext}, forwards control events, and
 * applies presentation (errors, ARIA) from the form-published `fields` map.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - One control — `[data-rui-control]` or a known host tag (`rui-checkbox`, `rui-switch`,
 *   `rui-slider`, `rui-knob`, `rui-number-field`, `rui-select`, …). The field reads and
 *   writes values through the control protocol; see each host's contract for inner targets.
 *   An embedded `rui-listbox` is an option surface, not a field control.
 *
 * Optional:
 * - `[data-rui-field-label]` — visible label. Host sets `htmlFor`.
 * - `[data-rui-field-description]` — helper text. Host sets `id` and wires `aria-describedby`.
 * - `[data-rui-field-error]` — error region. Host sets `id`, `textContent`, and `hidden`.
 * - `[data-ref="field"]` — column wrapping children; used to locate error regions.
 *
 * On each ARIA target the host writes `id` (when missing), `data-rui-field-managed`,
 * `aria-invalid`, `aria-required`, `aria-describedby`, and `aria-disabled` (when `disabled`).
 * Do not fight those attributes on controls inside a field.
 *
 * Nested hosts: any registered control host inside the field tree (see control protocol).
 *
 * @element rui-field
 *
 * @attr {string} name - Field name; registers with the ancestor form. Default: `''`.
 * @attr {string} error - Standalone error message when not using a form provider. Default: `''`.
 * @attr {boolean} invalid - Standalone invalid flag when not using a form provider. Default: `false`.
 * @attr {boolean} disabled - Dims the field and disables nested controls. Default: `false`.
 * @attr {string} data-default-value - JSON-serialized default value for SSR hydration. Default: `undefined`.
 *
 * @remarks
 * `rules` and `defaultValue` are object props — they only reach the element via
 * `prop:` bindings from the `RuiField` view, not plain attributes.
 *
 * **Why a custom element?** The field must observe an ancestor form context and
 * apply ARIA + error text to light-DOM nodes after mount — a JSX wrapper has no
 * lifecycle hook for that. The host queries `[data-ref="field"]` and data attrs.
 */
@customElement('rui-field')
export class RuiField extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: '' }) name: string;
	@prop({ type: Object }) rules?: FieldRules;
	@prop({ type: Object }) defaultValue?: unknown;
	@prop({ type: String, attribute: RUI_FIELD_DEFAULT_VALUE_ATTR }) defaultValueData?: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: String, defaultValue: '' }) error: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) invalid: boolean;

	@provideContext({
		context: fieldContext,
		initialValue: {
			name: '',
			controlId: '',
			descriptionId: '',
			errorId: '',
			error: undefined,
			invalid: false,
			required: false,
		},
		hydrate: Object,
		serialize: (value) => ({ ...value, rules: stripValidate(value.rules) }),
	})
	fieldProvider: ContextProvider<typeof fieldContext>;

	@consumeContext(formContext)
	private formContextProvider?: ContextProvider<typeof formContext>;

	private readonly uid = uniqueId('rui-field');
	/** Resolved field name from property or `name` attribute (Storybook can hydrate props after connect). */
	private resolveFieldName(): string {
		return (this.name || this.getAttribute('name') || '').trim();
	}

	private unregister?: () => void;
	private unregisterPresentation?: () => void;
	private registeredWithForm = false;
	/**
	 * Last form write that landed before `findFieldControl` could see a host.
	 * JSX can add the control later without reconnecting this field.
	 */
	private pendingControlWrite?: { value: unknown };
	private controlObserver?: MutationObserver;

	/**
	 * @remarks Registers SSR-prep rules on `fieldProvider` so hydrated fields recover them after a
	 * real SSR round-trip (`prop:rules` does not survive that boundary; `connectedCallback` never
	 * runs during SSR).
	 */
	constructor() {
		super();
		registerSsrPreparationCallback(this, () => this.fieldProvider.setContext({ rules: this.readFieldRules() }));
	}

	protected override onConnected(): void {
		this.connectToForm();
	}

	override disconnectedCallback(): void {
		this.unregister?.();
		this.unregister = undefined;
		this.unregisterPresentation?.();
		this.unregisterPresentation = undefined;
		this.registeredWithForm = false;
		this.clearPendingControlWrite();
		super.disconnectedCallback();
	}

	private get currentFormContext(): FormContextValue | undefined {
		return this.formContextProvider?.getContext();
	}

	private parseJsonAttr(raw: string | null | undefined): unknown {
		if (!raw) {
			return undefined;
		}
		try {
			return JSON.parse(raw);
		} catch {
			return undefined;
		}
	}

	/**
	 * Prefers the live `rules` prop — it's the only channel that can carry a `validate`
	 * function. Falls back to `fieldProvider`'s own context, which only ever holds the
	 * JSON-safe subset (see its `serialize` option) — this is what recovers rules after a
	 * real SSR hydrate, since `prop:rules` itself doesn't survive that boundary.
	 */
	private readFieldRules(): FieldRules | undefined {
		const rules = this.rules;
		if (rules && typeof rules === 'object' && !Array.isArray(rules) && Object.keys(rules).length > 0) {
			return rules;
		}
		return this.fieldProvider.getContext()?.rules;
	}

	private readDefaultValue(): unknown {
		if (this.defaultValue !== undefined) {
			return this.defaultValue;
		}
		return this.parseJsonAttr(this.defaultValueData ?? this.getAttribute(RUI_FIELD_DEFAULT_VALUE_ATTR));
	}

	private isRequired(): boolean {
		return Boolean(this.readFieldRules()?.required);
	}

	private resolveErrorMessage(formCtx?: FormContextValue): string | undefined {
		if (this.error) {
			return this.error;
		}
		const fieldName = this.resolveFieldName();
		if (!fieldName) {
			return undefined;
		}
		const ctx = formCtx ?? this.currentFormContext;
		return ctx?.fields[fieldName]?.error;
	}

	private resolveInvalid(formCtx?: FormContextValue): boolean {
		if (this.invalid) {
			return true;
		}
		if (this.error) {
			return true;
		}
		const fieldName = this.resolveFieldName();
		if (!fieldName) {
			return false;
		}
		const ctx = formCtx ?? this.currentFormContext;
		return ctx?.fields[fieldName]?.invalid ?? false;
	}

	private connectToForm(): void {
		const fieldName = this.resolveFieldName();
		const ctx = this.currentFormContext;
		const actions = ctx?.actions;
		if (!ctx?.ready || !actions || !fieldName) {
			this.syncField();
			return;
		}

		if (!this.registeredWithForm) {
			this.registeredWithForm = true;
			this.unregisterPresentation?.();
			this.unregisterPresentation = actions.subscribePresentation((ctx) => this.syncField(ctx));
			this.unregister = actions.register({
				name: fieldName,
				rules: this.readFieldRules(),
				getRules: () => this.readFieldRules(),
				defaultValue: this.readDefaultValue(),
				getValue: () => {
					const control = findFieldControl(this);
					return control ? readControlValue(control) : undefined;
				},
				setValue: (value) => {
					const control = findFieldControl(this);
					if (control) {
						writeControlValue(control, value);
						this.clearPendingControlWrite();
						return;
					}
					this.pendingControlWrite = { value };
					this.observeControlAppearance();
				},
			});
			this.syncField();
			return;
		}

		actions.updateFieldOptions(fieldName, {
			rules: this.readFieldRules(),
			defaultValue: this.readDefaultValue(),
		});
		this.syncField();
	}

	@onContextUpdate({ context: formContext, requestUpdate: false })
	onFormContextChanged(ctx: FormContextValue): void {
		if (!this.registeredWithForm) {
			if (ctx.ready) {
				this.connectToForm();
			} else {
				this.syncField(ctx);
			}
			return;
		}
		this.syncField(ctx);
	}

	@onUpdated(['name'])
	onNameUpdated(): void {
		this.unregister?.();
		this.unregister = undefined;
		this.unregisterPresentation?.();
		this.unregisterPresentation = undefined;
		this.registeredWithForm = false;
		this.clearPendingControlWrite();
		this.connectToForm();
	}

	@onUpdated(['rules', 'defaultValue', 'defaultValueData'])
	onRulesUpdated(): void {
		this.connectToForm();
	}

	@onUpdated(['disabled', 'error', 'invalid'])
	onPresentationUpdated(): void {
		this.syncField();
	}

	@onEvent({
		selector: FIELD_CONTROL_SELECTOR,
		type: 'rui-change',
	})
	onControlChange(event: Event): void {
		if (!isPrimaryFieldControlEvent(this, event)) {
			return;
		}

		const fieldName = this.resolveFieldName();
		if (fieldName) {
			this.currentFormContext?.actions.handleFieldChange(fieldName);
		}
	}

	@onEvent({
		selector: '[data-rui-control]',
		type: 'input',
		options: { capture: true },
	})
	onControlInput(): void {
		const fieldName = this.resolveFieldName();
		if (fieldName) {
			this.currentFormContext?.actions.handleFieldChange(fieldName);
		}
	}

	@onEvent({
		selector: '[data-rui-control]',
		type: 'change',
		options: { capture: true },
	})
	onControlNativeChange(): void {
		const fieldName = this.resolveFieldName();
		if (fieldName) {
			this.currentFormContext?.actions.handleFieldChange(fieldName);
		}
	}

	@onEvent({ selector: '[data-rui-control], rui-knob, rui-slider', type: 'focusout' })
	onControlFocusOut(): void {
		const fieldName = this.resolveFieldName();
		if (fieldName) {
			this.currentFormContext?.actions.handleFieldBlur(fieldName);
		}
	}

	private syncField(formCtx?: FormContextValue): void {
		const controlHost = findFieldControl(this);
		if (controlHost && this.pendingControlWrite) {
			writeControlValue(controlHost, this.pendingControlWrite.value);
			this.clearPendingControlWrite();
		}
		const ariaTargets = controlHost ? getAriaControlTargets(controlHost) : [];
		const ariaTarget = ariaTargets[0] ?? null;
		const controlId = ariaTarget?.id || `${this.uid}-control`;
		const descriptionId = `${this.uid}-desc`;
		const errorId = `${this.uid}-error`;
		const errorMessage = this.resolveErrorMessage(formCtx);
		const invalid = this.resolveInvalid(formCtx);
		const required = this.isRequired();

		const fieldName = this.resolveFieldName();
		wireFieldControlName(controlHost, ariaTarget, fieldName);

		const describedBy = this.syncDescriptions(descriptionId, errorId, errorMessage);
		this.syncAriaTargets(ariaTargets, controlId, describedBy, invalid, required);
		this.syncLabel(ariaTargets, ariaTarget);

		this.syncErrorPresentation(errorMessage);

		const nextFieldContext = {
			name: fieldName,
			controlId: ariaTarget?.id ?? controlId,
			descriptionId,
			errorId,
			error: errorMessage,
			invalid,
			required,
		};
		this.publishFieldContext(nextFieldContext);
	}

	/**
	 * @remarks JSX can insert the control after `register()` without reconnecting
	 * the field. `syncField` applies `pendingControlWrite` once the host exists.
	 */
	private observeControlAppearance(): void {
		if (this.controlObserver) {
			return;
		}

		this.controlObserver = new MutationObserver(() => this.syncField());
		this.controlObserver.observe(this, { childList: true, subtree: true });
	}

	private clearPendingControlWrite(): void {
		this.pendingControlWrite = undefined;
		this.controlObserver?.disconnect();
		this.controlObserver = undefined;
	}

	private syncDescriptions(descriptionId: string, errorId: string, errorMessage: string | undefined): string[] {
		const describedBy: string[] = [];
		const description = findFieldDescription(this);
		if (description) {
			description.id = descriptionId;
			describedBy.push(descriptionId);
		}
		const error = findFieldError(this);
		if (error) error.id = errorId;
		if (error && errorMessage) describedBy.push(errorId);
		return describedBy;
	}

	private syncLabel(targets: HTMLElement[], ariaTarget: HTMLElement | null): void {
		const label = findFieldLabel(this);
		if (!label || !ariaTarget) {
			return;
		}

		label.htmlFor = ariaTarget.id;
		if (isNativeTextControl(ariaTarget)) {
			return;
		}

		const labelId = label.id || `${this.uid}-label`;
		for (const target of targets) {
			bindVisibleLabel(label, target, { controlId: target.id, labelId });
		}
	}

	private syncAriaTargets(
		targets: HTMLElement[],
		controlId: string,
		describedBy: string[],
		invalid: boolean,
		required: boolean,
	): void {
		for (const [index, target] of targets.entries()) {
			if (!target.id) target.id = index === 0 ? controlId : `${controlId}-${index}`;
			target.setAttribute(RUI_FIELD_MANAGED_ATTR, '');
			target.setAttribute('aria-invalid', String(invalid));
			target.toggleAttribute('aria-required', required);
			if (required) target.setAttribute('aria-required', 'true');
			if (describedBy.length) target.setAttribute('aria-describedby', describedBy.join(' '));
			else target.removeAttribute('aria-describedby');
			if (this.disabled) this.disableAriaTarget(target);
		}
	}

	private disableAriaTarget(target: HTMLElement): void {
		target.setAttribute('aria-disabled', 'true');
		if (isNativeTextControl(target)) target.disabled = true;
	}

	private syncErrorPresentation(errorMessage: string | undefined): void {
		for (const error of findFieldErrorElements(this)) {
			error.textContent = errorMessage ?? '';
			error.hidden = !errorMessage;
			if (errorMessage) error.removeAttribute('hidden');
		}
	}

	private publishFieldContext(next: FieldContextValue): void {
		const previous = this.fieldProvider.getContext();
		if (isSameFieldContext(previous, next)) return;
		this.fieldProvider.setContext(next);
	}
}

function isSameFieldContext(previous: FieldContextValue, next: FieldContextValue): boolean {
	return (
		previous.name === next.name &&
		previous.controlId === next.controlId &&
		previous.descriptionId === next.descriptionId &&
		previous.errorId === next.errorId &&
		previous.error === next.error &&
		previous.invalid === next.invalid &&
		previous.required === next.required
	);
}
