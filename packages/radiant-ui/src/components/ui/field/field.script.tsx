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
	getAriaControlTarget,
	readControlValue,
	RUI_FIELD_DEFAULT_VALUE_ATTR,
	RUI_FIELD_MANAGED_ATTR,
	writeControlValue,
	wireFieldControlName,
} from '../form/control-protocol';
import { formContext, type FormContextValue } from '../form/form-context';
import { fieldContext } from './field-context';
import type { FieldRules } from '../form/types';

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
 * `<rui-field>` — connector between slotted controls and an ancestor `<rui-form>`.
 *
 * Registers with the form via {@link formContext} actions, forwards control events,
 * and applies presentation (errors, ARIA) from the form-published `fields` map.
 *
 * @element rui-field
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

	private uid = Math.random().toString(36).slice(2, 9);
	/** Resolved field name from property or `name` attribute (Storybook can hydrate props after connect). */
	private resolveFieldName(): string {
		return (this.name || this.getAttribute('name') || '').trim();
	}

	private unregister?: () => void;
	private unregisterPresentation?: () => void;
	private registeredWithForm = false;

	constructor() {
		super();
		// connectedCallback never runs during real SSR rendering — only this SSR-prep
		// lifecycle does, and only after `prop:rules` has already been applied to the
		// instance. Publishing rules onto fieldProvider here is what lets a hydrated field
		// recover them after a real SSR round-trip, since `prop:rules` itself doesn't
		// survive that boundary.
		registerSsrPreparationCallback(this, () => this.fieldProvider.setContext({ rules: this.readFieldRules() }));
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.connectToForm();
		queueMicrotask(() => {
			this.connectToForm();
		});
	}

	override disconnectedCallback(): void {
		this.unregister?.();
		this.unregister = undefined;
		this.unregisterPresentation?.();
		this.unregisterPresentation = undefined;
		this.registeredWithForm = false;
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
					}
				},
			});
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
		selector:
			'[data-rui-control], rui-combobox, rui-date-field, rui-date-range-picker, rui-checkbox, rui-switch, rui-radio-group, rui-slider, rui-number-field, rui-listbox',
		type: 'rui-change',
	})
	onControlChange(): void {
		const fieldName = this.resolveFieldName();
		if (fieldName) {
			this.currentFormContext?.actions.handleFieldChange(fieldName);
		}
	}

	@onEvent({
		selector: '[data-rui-control], input, textarea',
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
		selector: '[data-rui-control], input, textarea',
		type: 'change',
		options: { capture: true },
	})
	onControlNativeChange(): void {
		const fieldName = this.resolveFieldName();
		if (fieldName) {
			this.currentFormContext?.actions.handleFieldChange(fieldName);
		}
	}

	@onEvent({ selector: '[data-rui-control], input, textarea', type: 'focusout' })
	onControlFocusOut(): void {
		const fieldName = this.resolveFieldName();
		if (fieldName) {
			this.currentFormContext?.actions.handleFieldBlur(fieldName);
		}
	}

	private syncField(formCtx?: FormContextValue): void {
		const controlHost = findFieldControl(this);
		const ariaTarget = controlHost ? getAriaControlTarget(controlHost) : null;
		const controlId = ariaTarget?.id || `rui-field-control-${this.uid}`;
		const descriptionId = `rui-field-desc-${this.uid}`;
		const errorId = `rui-field-error-${this.uid}`;
		const errorMessage = this.resolveErrorMessage(formCtx);
		const invalid = this.resolveInvalid(formCtx);
		const required = this.isRequired();

		const fieldName = this.resolveFieldName();
		wireFieldControlName(controlHost, ariaTarget, fieldName);

		if (ariaTarget) {
			if (!ariaTarget.id) {
				ariaTarget.id = controlId;
			}
			ariaTarget.setAttribute(RUI_FIELD_MANAGED_ATTR, '');
			ariaTarget.setAttribute('aria-invalid', invalid ? 'true' : 'false');
			if (this.isRequired()) {
				ariaTarget.setAttribute('aria-required', 'true');
			} else {
				ariaTarget.removeAttribute('aria-required');
			}

			const describedBy: string[] = [];
			const description = findFieldDescription(this);
			if (description) {
				description.id = descriptionId;
				describedBy.push(descriptionId);
			}
			const errorEl = findFieldError(this);
			if (errorEl) {
				errorEl.id = errorId;
				if (errorMessage) {
					describedBy.push(errorId);
				}
			}

			if (describedBy.length > 0) {
				ariaTarget.setAttribute('aria-describedby', describedBy.join(' '));
			} else {
				ariaTarget.removeAttribute('aria-describedby');
			}

			if (this.disabled) {
				ariaTarget.setAttribute('aria-disabled', 'true');
				if (ariaTarget instanceof HTMLInputElement || ariaTarget instanceof HTMLTextAreaElement) {
					ariaTarget.disabled = true;
				}
			}
		}

		const label = findFieldLabel(this);
		if (label && ariaTarget) {
			label.htmlFor = ariaTarget.id;
		}

		for (const errorEl of findFieldErrorElements(this)) {
			errorEl.textContent = errorMessage ?? '';
			if (errorMessage) {
				errorEl.hidden = false;
				errorEl.removeAttribute('hidden');
			} else {
				errorEl.hidden = true;
			}
		}

		const nextFieldContext = {
			name: fieldName,
			controlId: ariaTarget?.id ?? controlId,
			descriptionId,
			errorId,
			error: errorMessage,
			invalid,
			required,
		};
		const prev = this.fieldProvider.getContext();
		if (
			prev.name === nextFieldContext.name &&
			prev.controlId === nextFieldContext.controlId &&
			prev.descriptionId === nextFieldContext.descriptionId &&
			prev.errorId === nextFieldContext.errorId &&
			prev.error === nextFieldContext.error &&
			prev.invalid === nextFieldContext.invalid &&
			prev.required === nextFieldContext.required
		) {
			return;
		}

		this.fieldProvider.setContext(nextFieldContext);
	}

	override render() {
		return (
			<div class="rui-field">
				<slot></slot>
			</div>
		);
	}
}
