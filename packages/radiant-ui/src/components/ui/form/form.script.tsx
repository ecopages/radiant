import { RadiantElement, customElement, event, onEvent, onUpdated, prop } from '@ecopages/radiant';
import { provideContext } from '@ecopages/radiant/context';
import type { ContextProvider } from '@ecopages/radiant/context';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import {
	formContext,
	type FormContextActions,
	type FormContextValue,
	type FormFieldPresentation,
} from './form-context';
import { FormStore } from './form-store';
import type { FieldValues, Resolver, ValidationMode } from './types';
import { RUI_FORM_DEFAULT_VALUES_ATTR } from './control-protocol';

export type RuiFormProps<T extends FieldValues = FieldValues> = {
	defaultValues?: Partial<T>;
	/** JSON default values for SSR / JSX attribute channel. */
	defaultValuesData?: string;
	resolver?: Resolver<T>;
	mode?: ValidationMode;
	reValidateMode?: ValidationMode;
	/** Receives validated values instead of performing a native form navigation. */
	onSubmit?: (values: T) => void | Promise<void>;
	/** Native form destination, used when `onSubmit` is not provided. */
	action?: string;
	/** Native form HTTP method, used when `onSubmit` is not provided. */
	method?: HTMLFormElement['method'];
};

export type RuiFormSubmitDetail<T extends FieldValues = FieldValues> = {
	values: T;
};

export type RuiFormInvalidDetail<T extends FieldValues = FieldValues> = {
	errors: Partial<Record<keyof T, { message?: string }>>;
};

const noopUnregister = () => {};

const initialFormActions: FormContextActions = {
	register: () => noopUnregister,
	updateFieldOptions: () => {},
	handleFieldChange: () => {},
	handleFieldBlur: () => {},
	subscribePresentation: () => noopUnregister,
};

/**
 * `<rui-form>` — form coordinator with RHF-like validation and field registration.
 *
 * The custom element is a behavior host: it does not render field markup. It owns
 * the {@link FormStore}, publishes field presentation via {@link formContext}, and
 * coordinates `<rui-field>` connectors and a composed native `<form>`.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-ref="form"]` — native `<form noValidate>`. Host listens
 *   for `submit` and `reset` on this node.
 *
 * Optional:
 * - `button[type="submit"]` outside the native form — host sets `form` to associate
 *   orphan submit buttons with the inner form.
 * - `rui-field` descendants — register through context; each field owns its control tree.
 *
 * Nested hosts: `rui-field` (and each field's control host). The form does not query
 * control targets directly.
 *
 * @element rui-form
 *
 * @attr {('onSubmit'|'onBlur'|'onChange'|'onTouched'|'all')} mode - When validation runs. Default: `onSubmit`.
 * @attr {('onSubmit'|'onBlur'|'onChange'|'onTouched'|'all')} revalidate-mode - When fields re-validate after a failed submit. Default: `onChange`.
 * @attr {string} data-default-values - JSON-serialized default values for SSR / JSX attribute channel. Default: `undefined`.
 * @attr {string} action - Native form destination when `onSubmit` is not provided.
 * @attr {string} method - Native form HTTP method when `onSubmit` is not provided.
 *
 * @fires rui-submit - Emitted when validation passes; `detail.values` holds field values.
 * @fires rui-invalid - Emitted when validation fails on submit; `detail.errors` maps field names to error messages.
 *
 * @remarks
 * `defaultValues` and `resolver` are object props — they only reach the element via
 * `prop:` bindings from the `RuiForm` view, not plain attributes. The host queries
 * `[data-ref="form"]`.
 */
@customElement('rui-form')
export class RuiForm extends RadiantElement {
	@provideContext({
		context: formContext,
		initialValue: {
			ready: false,
			revision: 0,
			fields: {},
			errors: {},
			actions: initialFormActions,
		},
	})
	formProvider: ContextProvider<typeof formContext>;

	@event({ name: 'rui-submit', bubbles: true, composed: true })
	submitEvent: EventEmitter<RuiFormSubmitDetail>;

	@event({ name: 'rui-invalid', bubbles: true, composed: true })
	invalidEvent: EventEmitter<RuiFormInvalidDetail>;

	@prop({ type: Object, defaultValue: {} }) defaultValues: FieldValues;
	@prop({ type: String, attribute: RUI_FORM_DEFAULT_VALUES_ATTR }) defaultValuesData?: string;
	@prop({ type: Object }) resolver?: Resolver<FieldValues>;
	@prop({ type: String, reflect: true, defaultValue: 'onSubmit' }) mode: ValidationMode;
	@prop({ type: String, reflect: true, attribute: 'revalidate-mode', defaultValue: 'onChange' })
	reValidateMode: ValidationMode;
	@prop({ type: String, reflect: true }) action?: string;
	@prop({ type: String, reflect: true }) method?: HTMLFormElement['method'];
	onSubmit?: (values: FieldValues) => void | Promise<void>;

	private store: FormStore | undefined;
	private unsubscribeStore?: () => void;
	private readonly nativeFormId = `rui-form-native-${Math.random().toString(36).slice(2, 9)}`;
	private lastPublishedRevision = -1;
	private lastPublishedContext: FormContextValue | undefined;
	private readonly presentationListeners = new Set<(value: FormContextValue) => void>();
	private readonly formActions: FormContextActions = {
		register: (registration) => {
			const store = this.ensureStore();
			const unregister = store.register(registration);
			this.publishFormContext({ force: true });
			return () => {
				unregister();
				this.publishFormContext({ force: true });
			};
		},
		updateFieldOptions: (name, options) => {
			this.ensureStore().updateFieldOptions(name, options);
		},
		handleFieldChange: (name) => {
			void this.ensureStore()
				.handleFieldChange(name)
				.then(() => this.publishFormContext({ force: true }));
		},
		handleFieldBlur: (name) => {
			void this.ensureStore()
				.handleFieldBlur(name)
				.then(() => this.publishFormContext({ force: true }));
		},
		subscribePresentation: (listener) => {
			this.presentationListeners.add(listener);
			if (this.lastPublishedContext) {
				listener(this.lastPublishedContext);
			}
			return () => this.presentationListeners.delete(listener);
		},
	};

	override connectedCallback(): void {
		super.connectedCallback();
		this.ensureStore();
		this.publishFormContext({ force: true });
	}

	protected override onConnected(): void {
		this.wireOrphanSubmitButtons();
	}

	private queryNativeForm(): HTMLFormElement | null {
		return this.getRef<HTMLFormElement>('form');
	}

	/** Link submit buttons left on the host outside the composed native `<form>`. */
	private wireOrphanSubmitButtons(): void {
		const formEl = this.queryNativeForm();
		if (!formEl) {
			return;
		}
		if (!formEl.id) {
			formEl.id = this.nativeFormId;
		}
		for (const btn of this.querySelectorAll<HTMLButtonElement>('button[type=submit]')) {
			if (formEl.contains(btn)) {
				continue;
			}
			btn.setAttribute('form', formEl.id);
		}
	}

	private runFormSubmit(): void {
		const store = this.ensureStore();
		void store.handleSubmit(
			async (values) => {
				this.submitEvent.emit({ values });
				if (typeof this.onSubmit === 'function') {
					await this.onSubmit(values);
					return;
				}
				if (this.hasNativeSubmission()) {
					this.queryNativeForm()?.submit();
				}
			},
			(errors) => {
				this.invalidEvent.emit({ errors });
			},
		);
	}

	private hasNativeSubmission(): boolean {
		return (
			typeof this.onSubmit !== 'function' &&
			(this.getAttribute('action') !== null || this.getAttribute('method') !== null)
		);
	}

	override disconnectedCallback(): void {
		this.unsubscribeStore?.();
		this.unsubscribeStore = undefined;
		super.disconnectedCallback();
	}

	private resolveMode(): ValidationMode {
		const fromAttr = this.getAttribute('mode');
		if (fromAttr) {
			return fromAttr as ValidationMode;
		}
		return this.mode ?? 'onSubmit';
	}

	private resolveReValidateMode(): ValidationMode {
		const fromAttr = this.getAttribute('revalidate-mode');
		if (fromAttr) {
			return fromAttr as ValidationMode;
		}
		return this.reValidateMode ?? 'onChange';
	}

	private resolveDefaultValues(): FieldValues {
		if (this.defaultValues && Object.keys(this.defaultValues).length > 0) {
			return this.defaultValues;
		}
		const raw = this.defaultValuesData ?? this.getAttribute(RUI_FORM_DEFAULT_VALUES_ATTR);
		if (!raw) {
			return this.defaultValues ?? {};
		}
		try {
			const parsed = JSON.parse(raw) as FieldValues;
			return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
		} catch {
			return this.defaultValues ?? {};
		}
	}

	private ensureStore(): FormStore {
		if (this.store) {
			return this.store;
		}

		this.store = new FormStore({
			defaultValues: this.resolveDefaultValues(),
			resolver: typeof this.resolver === 'function' ? this.resolver : undefined,
			mode: this.resolveMode(),
			reValidateMode: this.resolveReValidateMode(),
		});
		this.unsubscribeStore = this.store.subscribe(() => this.publishFormContext());
		return this.store;
	}

	private buildFieldPresentations(store: FormStore): Record<string, FormFieldPresentation> {
		const fields: Record<string, FormFieldPresentation> = {};
		for (const name of store.getRegisteredFieldNames()) {
			const message = store.getFieldError(name);
			const show = store.shouldDisplayFieldError(name);
			fields[name] = {
				error: show ? message : undefined,
				invalid: Boolean(show && message),
			};
		}
		return fields;
	}

	private publishFormContext(options?: { force?: boolean }): void {
		const store = this.store;
		if (!store) {
			return;
		}
		const revision = store.getRevision();
		if (!options?.force && revision === this.lastPublishedRevision) {
			return;
		}
		this.lastPublishedRevision = revision;
		const nextContext = {
			ready: true,
			revision,
			fields: this.buildFieldPresentations(store),
			errors: { ...store.errors },
			actions: this.formActions,
		} satisfies FormContextValue;
		this.lastPublishedContext = nextContext;
		this.formProvider.setContext(nextContext);
		for (const listener of this.presentationListeners) {
			listener(nextContext);
		}
	}

	@onUpdated(['defaultValues', 'defaultValuesData', 'mode', 'reValidateMode'])
	syncOptions(): void {
		const store = this.ensureStore();
		store.updateOptions({
			defaultValues: this.resolveDefaultValues(),
			mode: this.resolveMode(),
			reValidateMode: this.resolveReValidateMode(),
		});
	}

	@onUpdated(['resolver'])
	syncResolver(): void {
		if (typeof this.resolver === 'function') {
			this.ensureStore().updateOptions({ resolver: this.resolver });
		}
	}

	/** Save clicks must run validation even when the button is not associated with the inner `<form>`. */
	@onEvent({ selector: 'button[type=submit]', type: 'click' })
	onSubmitButtonClick(event: Event): void {
		event.preventDefault();
		this.runFormSubmit();
	}

	@onEvent({ ref: 'form', type: 'submit' })
	onNativeSubmit(event: SubmitEvent): void {
		event.preventDefault();
		this.runFormSubmit();
	}

	@onEvent({ ref: 'form', type: 'reset' })
	onNativeReset(): void {
		this.store?.reset();
	}
}
