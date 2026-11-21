import type { JSX_PROPS } from '@ecopages/jsx';
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
import type { FormDriver } from './form-driver';
import type { FormStateStore } from './form-state-store';
import { InjectedFormDriver } from './injected-form-driver';
import type { FieldRegistration, FieldValues, RegisterOptions, Resolver, ValidationMode } from './types';
import { RUI_FORM_DEFAULT_VALUES_ATTR } from './control-protocol';
import { uniqueId } from '@/lib/unique-id';

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
	/**
	 * A form state store the host owns. Without it the form creates its own
	 * {@link FormStore}. See {@link FormStateStore}.
	 */
	store?: FormStateStore;
};

export type RuiFormSubmitDetail<T extends FieldValues = FieldValues> = {
	values: T;
};

export type RuiFormInvalidDetail<T extends FieldValues = FieldValues> = {
	errors: Partial<Record<keyof T, { message?: string }>>;
	/** Set when validation threw instead of reporting errors; the submission is invalid. */
	error?: unknown;
};

/** A field's registration as the form tracks it across driver switches and renames. */
type RegistrationEntry = {
	registration: FieldRegistration;
	unregister: () => void;
	/** True while a driver renames the field, whose unregister function is not known yet. */
	renaming?: boolean;
	/** Set when the field was removed during its rename; the new unregister runs once it exists. */
	removed?: boolean;
};

const noopUnregister = () => {};

const initialFormActions: FormContextActions = {
	register: () => noopUnregister,
	renameField: () => {},
	updateFieldOptions: () => {},
	handleFieldChange: () => {},
	handleFieldBlur: () => {},
	subscribePresentation: () => noopUnregister,
};

/**
 * `<rui-form>` — form coordinator with RHF-like validation and field registration.
 *
 * The custom element is a behavior host: it does not render field markup. It owns
 * the {@link FormStore} unless a {@link FormStateStore} is injected, publishes field presentation via {@link formContext}, and
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
 * @fires rui-invalid - Emitted when validation fails on submit; `detail.errors` maps field names to error messages. `detail.error` is set when a validator threw.
 *
 * @remarks
 * `defaultValues` and `resolver` are object props — they only reach the element via
 * `prop:` bindings from the `RuiForm` view, not plain attributes. The host queries
 * `[data-ref="form"]`.
 *
 * Two channels: `onSubmit` / `rui-submit` receive the store; native `FormData` and
 * `action` / `method` navigation receive listed controls only. `onSubmit` skips
 * native navigation.
 *
 * `formContext.store` exposes the live store to scoped consumers once ready: the
 * injected store when `store` is set, otherwise the form's own {@link FormStore}.
 * Hydration payloads contain presentation only, never the store or its actions.
 *
 * With an injected store the form is a control bridge: it keeps control
 * registration, native validity, error presentation, submit and `FormData`, and
 * the store owns validation timing, touched and dirty state, defaults and which
 * errors show. `mode`, `revalidate-mode`, `defaultValues`, field `defaultValue`,
 * `resolver` and field `rules` are ignored. Setting, replacing or clearing `store`
 * re-registers every control: the new store's values are written into the
 * controls, and clearing it returns to the form's own store in the state it left,
 * including its earlier errors, touched fields and submitted flag.
 */
@customElement('rui-form')
export class RuiForm extends RadiantElement {
	declare readonly [JSX_PROPS]?: RuiFormProps;

	@provideContext({
		context: formContext,
		initialValue: {
			ready: false,
			store: undefined,
			revision: 0,
			fields: {},
			errors: {},
			actions: initialFormActions,
		},
		hydrate: Object,
		serialize: ({ revision, fields, errors }) => ({ ready: false, revision, fields, errors }),
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
	@prop({ type: Object }) store?: FormStateStore;
	onSubmit?: (values: FieldValues) => void | Promise<void>;

	private driver: FormDriver | undefined;
	private ownStore: FormStore | undefined;
	private drivenStore: FormStateStore | undefined;
	private unsubscribeDriver?: () => void;
	private readonly registrations = new Set<RegistrationEntry>();
	private readonly nativeFormId = uniqueId('rui-form');
	private lastPublishedRevision = -1;
	private lastPublishedContext: FormContextValue | undefined;
	private readonly presentationListeners = new Set<(value: FormContextValue) => void>();
	private readonly formActions: FormContextActions = {
		register: (registration) => {
			const entry: RegistrationEntry = { registration, unregister: this.ensureDriver().register(registration) };
			this.registrations.add(entry);
			this.publishFormContext({ force: true });
			return () => {
				this.registrations.delete(entry);
				if (entry.renaming) {
					entry.removed = true;
					return;
				}
				entry.unregister();
				this.publishFormContext({ force: true });
			};
		},
		renameField: (from, registration) => {
			const entry = [...this.registrations].find((candidate) => candidate.registration.name === from);
			if (entry) {
				entry.renaming = true;
				entry.registration = registration;
			}
			const unregister = this.ensureDriver().renameField(from, registration);
			if (entry) {
				entry.renaming = false;
				entry.unregister = unregister;
				if (entry.removed) {
					unregister();
				}
			}
			this.publishFormContext({ force: true });
		},
		updateFieldOptions: (name, options) => {
			this.ensureDriver().updateFieldOptions(name, options);
			this.rememberFieldOptions(name, options);
		},
		handleFieldChange: (name) => {
			void this.ensureDriver()
				.handleFieldChange(name)
				.then(() => this.publishFormContext({ force: true }));
		},
		handleFieldBlur: (name) => {
			void this.ensureDriver()
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
		this.ensureDriver();
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

	/**
	 * @remarks A validation that throws emits `rui-invalid` with the thrown value as
	 * `detail.error`, so every submission ends in `rui-submit` or `rui-invalid`. A
	 * rejection from `onSubmit` has no event of its own; it is reported with
	 * `reportError` so it is not an unhandled rejection and `window` sees an `error`
	 * event.
	 */
	private runFormSubmit(): void {
		this.ensureDriver()
			.handleSubmit(
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
				(errors, error) => {
					this.invalidEvent.emit(error === undefined ? { errors } : { errors, error });
				},
			)
			.catch((error: unknown) => reportError(error));
	}

	private hasNativeSubmission(): boolean {
		return (
			typeof this.onSubmit !== 'function' &&
			(this.getAttribute('action') !== null || this.getAttribute('method') !== null)
		);
	}

	override disconnectedCallback(): void {
		this.unsubscribeDriver?.();
		this.unsubscribeDriver = undefined;
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

	private resolveInjectedStore(): FormStateStore | undefined {
		return typeof this.store === 'object' && this.store !== null ? this.store : undefined;
	}

	/** The store `formContext` exposes: the injected one, else the form's own. */
	private resolveStateStore(): FormStateStore | undefined {
		return this.drivenStore ?? this.ownStore;
	}

	/**
	 * Returns the driver for the current `store` property, switching drivers when it changed.
	 *
	 * @remarks A switch unregisters every control from the old driver and registers it
	 * into the new one, which writes the new store's values into the controls. The
	 * form's own {@link FormStore} is created once and reused when the injected
	 * store is removed, with its earlier values, errors, touched fields and submitted
	 * flag. A disconnected form binds no driver, so it holds no store subscription.
	 */
	private ensureDriver(): FormDriver {
		const injected = this.resolveInjectedStore();
		if (this.driver && this.drivenStore === injected) {
			this.bindDriver(this.driver);
			return this.driver;
		}
		const switching = this.driver !== undefined;
		this.unsubscribeDriver?.();
		this.unsubscribeDriver = undefined;
		if (this.driver instanceof InjectedFormDriver) {
			this.driver.dispose();
		}
		this.drivenStore = injected;
		if (injected) {
			this.driver = new InjectedFormDriver(injected);
		} else {
			if (this.ownStore) {
				this.ownStore.updateOptions({
					defaultValues: this.resolveDefaultValues(),
					mode: this.resolveMode(),
					reValidateMode: this.resolveReValidateMode(),
				});
			} else {
				this.ownStore = new FormStore({
					defaultValues: this.resolveDefaultValues(),
					resolver: typeof this.resolver === 'function' ? this.resolver : undefined,
					mode: this.resolveMode(),
					reValidateMode: this.resolveReValidateMode(),
				});
			}
			this.driver = this.ownStore;
		}
		this.bindDriver(this.driver);
		if (switching) {
			for (const entry of this.registrations) {
				entry.unregister();
				entry.unregister = this.driver.register(entry.registration);
			}
			this.publishFormContext({ force: true });
		}
		return this.driver;
	}

	private bindDriver(driver: FormDriver): void {
		if (!this.isConnected) {
			return;
		}
		this.unsubscribeDriver ??= driver.subscribe(() => this.publishFormContext());
	}

	/** Keep what a driver switch re-registers current with later `rui-field` updates. */
	private rememberFieldOptions(name: string, options: RegisterOptions): void {
		for (const entry of this.registrations) {
			if (entry.registration.name !== name) {
				continue;
			}
			entry.registration = {
				...entry.registration,
				...(options.rules !== undefined ? { rules: options.rules } : {}),
				...('defaultValue' in options ? { defaultValue: options.defaultValue } : {}),
			};
		}
	}

	private buildFieldPresentations(store: FormDriver): Record<string, FormFieldPresentation> {
		const fields: Record<string, FormFieldPresentation> = {};
		for (const name of store.getRegisteredFieldNames()) {
			const show = store.shouldDisplayFieldError(name);
			fields[name] = {
				error: show ? store.getFieldError(name) : undefined,
				invalid: show,
			};
		}
		return fields;
	}

	private publishFormContext(options?: { force?: boolean }): void {
		const store = this.driver;
		const stateStore = this.resolveStateStore();
		if (!store || !stateStore) {
			return;
		}
		const revision = store.getRevision();
		if (!options?.force && revision === this.lastPublishedRevision) {
			return;
		}
		this.lastPublishedRevision = revision;
		const nextContext = {
			ready: true,
			store: stateStore,
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
		this.ensureDriver();
		this.ownStore?.updateOptions({
			defaultValues: this.resolveDefaultValues(),
			mode: this.resolveMode(),
			reValidateMode: this.resolveReValidateMode(),
		});
	}

	@onUpdated(['resolver'])
	syncResolver(): void {
		if (typeof this.resolver === 'function') {
			this.ownStore?.updateOptions({ resolver: this.resolver });
		}
	}

	@onUpdated(['store'])
	syncInjectedStore(): void {
		this.ensureDriver();
		this.publishFormContext({ force: true });
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
		this.driver?.reset();
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'rui-form': RuiForm;
	}
}
