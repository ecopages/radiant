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
import type { FormStateStore, NativeValidity } from './form-state-store';
import { InjectedFormDriver } from './injected-form-driver';
import { StoreBinding, type BoundStore, type SubmitHelpers } from './store-binding';
import type {
	FieldError,
	FieldRegistration,
	FieldRegistrationHandle,
	FieldValues,
	RegisterOptions,
	Resolver,
	ValidationMode,
} from './types';
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
	/** Takes over submit when `store` is injected; see {@link RuiFormSubmitHandler}. */
	submitHandler?: RuiFormSubmitHandler;
	/** Takes over the native `reset` event when `store` is injected; see {@link RuiFormResetHandler}. */
	resetHandler?: RuiFormResetHandler;
	/** Text for errors and warnings; see {@link RuiFormFormatError}. */
	formatError?: RuiFormFormatError;
};

/** What `RuiForm` hands a {@link RuiFormSubmitHandler}. */
export type RuiFormSubmitContext<TIssue extends FieldError = FieldError> = {
	/** The injected store, with the controls' values already flushed into it. */
	store: FormStateStore<TIssue>;
	/** Focuses the control registered for a path, for the host to move focus to the first invalid field. */
	focus: (path: string) => void;
	/**
	 * Validates through the store with the current native validity of every control.
	 * It is sugar for a host with no submission protocol of its own; a host runtime
	 * that does, such as one holding a submission token, calls its container's
	 * `validate` itself with `readNativeValidity()`.
	 */
	validate: (paths?: string[]) => Promise<boolean>;
	/**
	 * The current native validity of every bridged control, `null` for a valid one,
	 * to pass as `validate`'s `native` option when the host validates itself.
	 */
	readNativeValidity: () => Record<string, NativeValidity | null>;
	/** Submits the native `<form>` to its `action` and `method`; does nothing when neither is set. */
	submitNatively: () => void;
};

/**
 * Called on submit instead of the form's own validate-then-emit path.
 *
 * @remarks Only with an injected store. The host validates, counts attempts,
 * focuses and submits; the form emits neither `rui-submit` nor `rui-invalid`. A
 * rejection is reported with `reportError`.
 */
export type RuiFormSubmitHandler<TIssue extends FieldError = FieldError> = (
	context: RuiFormSubmitContext<TIssue>,
) => void | Promise<void>;

/** What `RuiForm` hands a {@link RuiFormResetHandler}. */
export type RuiFormResetContext<TIssue extends FieldError = FieldError> = {
	/** The injected store. */
	store: FormStateStore<TIssue>;
};

/**
 * Called on the native `reset` event instead of resetting the store.
 *
 * @remarks Only with an injected store. The host restores its own state, and the
 * form then rewrites every control from the store, again after the browser's own
 * reset. A rejection is reported with `reportError`.
 */
export type RuiFormResetHandler<TIssue extends FieldError = FieldError> = (
	context: RuiFormResetContext<TIssue>,
) => void | Promise<void>;

/**
 * Produces the text for an error or a warning from its type and params, so an issue
 * with no message of its own is never shown blank.
 *
 * @remarks A result that is empty falls back to the issue's `message`.
 */
export type RuiFormFormatError<TIssue extends FieldError = FieldError> = (
	issue: TIssue,
	field: { path: string },
) => string;

/** The handlers `connect` takes, typed by the store's own issue type. */
export type RuiFormHandlers<TIssue extends FieldError = FieldError> = {
	formatError?: RuiFormFormatError<TIssue>;
	submitHandler?: RuiFormSubmitHandler<TIssue>;
	resetHandler?: RuiFormResetHandler<TIssue>;
};

export type RuiFormSubmitDetail<T extends FieldValues = FieldValues> = {
	values: T;
};

export type RuiFormInvalidDetail<_T extends FieldValues = FieldValues> = {
	errors: Partial<Record<string, { message?: string }>>;
	/** Set when validation threw instead of reporting errors; the submission is invalid. */
	error?: unknown;
};

/** A field's registration as the form tracks it across driver switches and renames. */
type RegistrationEntry = {
	/** The registration with its current name, so a driver switch re-registers it as it stands. */
	registration: FieldRegistration;
	handle: FieldRegistrationHandle;
};

const noopUnregister = () => {};

const noopHandle: FieldRegistrationHandle = { rename: () => {}, unregister: noopUnregister };

const initialFormActions: FormContextActions = {
	register: () => noopHandle,
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
	@prop({ type: Object }) submitHandler?: RuiFormSubmitHandler;
	@prop({ type: Object }) resetHandler?: RuiFormResetHandler;
	@prop({ type: Object }) formatError?: RuiFormFormatError;
	onSubmit?: (values: FieldValues) => void | Promise<void>;

	private driver: FormDriver | undefined;
	private ownStore: FormStore | undefined;
	private drivenStore: FormStateStore | undefined;
	private explicitBinding: BoundStore | undefined;
	private unsubscribeDriver?: () => void;
	private readonly registrations = new Set<RegistrationEntry>();
	private readonly nativeFormId = uniqueId('rui-form');
	private lastPublishedRevision = -1;
	private lastPublishedContext: FormContextValue | undefined;
	private readonly presentationListeners = new Set<(value: FormContextValue) => void>();
	private readonly formActions: FormContextActions = {
		register: (registration) => {
			const entry: RegistrationEntry = { registration, handle: this.ensureDriver().register(registration) };
			this.registrations.add(entry);
			this.publishFormContext({ force: true });
			return {
				rename: (name) => {
					entry.registration = { ...entry.registration, name };
					entry.handle.rename(name);
					this.publishFormContext({ force: true });
				},
				unregister: () => {
					this.registrations.delete(entry);
					entry.handle.unregister();
					this.publishFormContext({ force: true });
				},
			};
		},
		updateFieldOptions: (name, options) => {
			this.ensureDriver().updateFieldOptions(name, options);
			this.rememberFieldOptions(name, options);
		},
		handleFieldChange: (name) => {
			this.ensureDriver()
				.handleFieldChange(name)
				.then(() => this.publishFormContext({ force: true }))
				.catch((error: unknown) => reportError(error));
		},
		handleFieldBlur: (name) => {
			this.ensureDriver()
				.handleFieldBlur(name)
				.then(() => this.publishFormContext({ force: true }))
				.catch((error: unknown) => reportError(error));
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
		const driver = this.ensureDriver();
		const binding = this.binding();
		if (driver instanceof InjectedFormDriver && binding?.hasSubmitHandler) {
			driver.flush();
			const helpers: SubmitHelpers = {
				focus: (path) => driver.focus(path),
				validate: (paths) => driver.validate(paths),
				readNativeValidity: () => driver.readNativeValidity(),
				submitNatively: () => {
					if (this.getAttribute('action') !== null || this.getAttribute('method') !== null) {
						this.queryNativeForm()?.submit();
					}
				},
			};
			Promise.resolve()
				.then(() => binding.submit(helpers))
				.catch((error: unknown) => reportError(error));
			return;
		}
		driver
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
		if (this.driver instanceof InjectedFormDriver) {
			this.driver.dispose();
		}
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
				entry.handle.unregister();
				entry.handle = this.driver.register(entry.registration);
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

	/**
	 * The binding of the current store with its handlers: the one `connect` made for
	 * it, else one built from the plain `formatError`, `submitHandler` and
	 * `resetHandler` properties, which are typed for `FieldError`.
	 */
	private binding(): BoundStore | undefined {
		const store = this.resolveStateStore();
		if (!store) {
			return undefined;
		}
		if (this.explicitBinding?.store === store) {
			return this.explicitBinding;
		}
		return new StoreBinding<FieldError>(store, {
			formatError: this.formatError,
			submitHandler: this.submitHandler,
			resetHandler: this.resetHandler,
		});
	}

	/**
	 * Built with `Object.fromEntries`, which defines own properties, so a field named
	 * `__proto__` is a key like any other instead of replacing the map's prototype.
	 */
	private buildFieldPresentations(driver: FormDriver): Record<string, FormFieldPresentation> {
		const binding = this.binding();
		return Object.fromEntries(
			driver.getRegisteredFieldNames().map((name) => {
				const show = driver.shouldDisplayFieldError(name);
				const presentation: FormFieldPresentation = {
					error: show ? binding?.text('errors', name) : undefined,
					invalid: show,
					warning: binding?.text('warnings', name),
				};
				return [name, presentation];
			}),
		);
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

	/**
	 * Connect a store and the handlers that work with its own issue type: the
	 * formatter's `issue` and each handler's `context.store` are typed from `store`,
	 * so a store whose entries carry more than `FieldError` needs no cast.
	 *
	 * @remarks The element builds a {@link StoreBinding} that holds the store and the
	 * handlers together, so an issue goes from the store's snapshot to `formatError`
	 * with its type intact. The binding stands in for the plain `formatError`,
	 * `submitHandler` and `resetHandler` properties as long as `store` is the one it
	 * was made for; assign those properties instead when the store's entries are the
	 * minimal `FieldError`.
	 */
	connect<TIssue extends FieldError>(store: FormStateStore<TIssue>, handlers: RuiFormHandlers<TIssue> = {}): void {
		this.explicitBinding = new StoreBinding(store, handlers);
		this.store = store;
		this.publishFormContext({ force: true });
	}

	/**
	 * The current native validity of every control the form bridges, `null` for a
	 * valid one. Hosts that validate on their own pass it to the store's `validate`.
	 */
	readNativeValidity(): Record<string, NativeValidity | null> {
		return this.ensureDriver().readNativeValidity();
	}

	@onUpdated(['formatError'])
	syncFormatError(): void {
		this.publishFormContext({ force: true });
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
		const driver = this.driver;
		const binding = this.binding();
		if (driver instanceof InjectedFormDriver && binding?.hasResetHandler) {
			driver.resetThrough(() => binding.reset()).catch((error: unknown) => reportError(error));
			return;
		}
		driver?.reset();
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'rui-form': RuiForm;
	}
}
