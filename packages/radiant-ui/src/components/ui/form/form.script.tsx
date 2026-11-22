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
} from '@/lib/form/form-context';
import { FormStore } from '@/lib/form/form-store';
import type { FormDriver } from '@/lib/form/form-driver';
import type { FormStateStore } from '@/lib/form/form-state-store';
import type { RuiFormFormatError, RuiFormHandlers } from '@/lib/form/form-handlers';

import { InjectedFormDriver } from '@/lib/form/injected-form-driver';
import { OwnFormDriver } from '@/lib/form/own-form-driver';
import { StoreBinding, type BoundStore } from '@/lib/form/store-binding';
import type {
	FieldError,
	FieldRegistration,
	FieldRegistrationHandle,
	FieldValues,
	RegisterOptions,
	Resolver,
	ValidationMode,
} from '@/lib/form/types';
import { RUI_FORM_DEFAULT_VALUES_ATTR } from '@/lib/form/control-protocol';
import { uniqueId } from '@/lib/unique-id';

export type {
	RuiFormFormatError,
	RuiFormHandlers,
	RuiFormResetHandler,
	RuiFormSubmitContext,
	RuiFormSubmitHandler,
} from '@/lib/form/form-handlers';

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
	 * Text for the errors and warnings of the form's own {@link FormStore}; see
	 * {@link RuiFormFormatError}. A store injected with `connect` takes its formatter
	 * from `connect`'s handlers instead.
	 */
	formatError?: RuiFormFormatError;
};

export type RuiFormSubmitDetail<T extends FieldValues = FieldValues> = {
	values: T;
};

export type RuiFormInvalidDetail<_T extends FieldValues = FieldValues> = {
	errors: Partial<Record<string, FieldError>>;
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

const noopHandle: FieldRegistrationHandle = { rename: () => {}, unregister: noopUnregister, refresh: () => {} };

const initialFormActions: FormContextActions = {
	register: () => noopHandle,
	updateFieldOptions: () => {},
	handleFieldChange: () => {},
	handleFieldBlur: () => {},
	subscribePresentation: () => noopUnregister,
};

/** An unset string prop reads `''`, which stands for no attribute. */
function setOptionalAttribute(element: Element, name: string, value: string | undefined): void {
	if (value) {
		element.setAttribute(name, value);
	} else {
		element.removeAttribute(name);
	}
}

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
 * `defaultValues`, `resolver` and `formatError` are object props — property-only
 * (`attribute: false`), so they reach the element only via `prop:` bindings from the
 * `RuiForm` view, never as attributes. The host queries `[data-ref="form"]`.
 *
 * `sync()` writes the controls the user changed into the injected store and reports
 * the native validity of every bridged control; submit calls it first.
 *
 * Two channels: `onSubmit` / `rui-submit` receive the store; native `FormData` and
 * `action` / `method` navigation receive listed controls only. `onSubmit` skips
 * native navigation.
 *
 * `formContext.store` exposes the live store to scoped consumers once ready: the
 * store given to `connect`, otherwise the form's own {@link FormStore}.
 * Hydration payloads contain presentation only, never the store or its actions.
 *
 * With an injected store the form is a control bridge: it keeps control
 * registration, native validity, error presentation, submit and `FormData`, and
 * the store owns validation timing, touched and dirty state, defaults and which
 * errors show. `mode`, `revalidate-mode`, `defaultValues`, field `defaultValue`,
 * `resolver` and field `rules` are ignored. Calling `connect` with another store
 * re-registers every control and writes the new store's values into the controls
 * (the same store only replaces the handlers), and the disposer `connect` returns
 * brings back the form's own store in the state it left, including its earlier
 * errors, touched fields and submitted flag.
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

	@prop({ type: Object, attribute: false, defaultValue: {} }) defaultValues: FieldValues;
	@prop({ type: String, attribute: RUI_FORM_DEFAULT_VALUES_ATTR }) defaultValuesData?: string;
	@prop({ type: Object, attribute: false }) resolver?: Resolver<FieldValues>;
	@prop({ type: String, reflect: true, defaultValue: 'onSubmit' }) mode: ValidationMode;
	@prop({ type: String, reflect: true, attribute: 'revalidate-mode', defaultValue: 'onChange' })
	reValidateMode: ValidationMode;
	@prop({ type: String, reflect: true }) action?: string;
	@prop({ type: String, reflect: true }) method?: HTMLFormElement['method'];
	@prop({ type: Object, attribute: false }) formatError?: RuiFormFormatError;
	onSubmit?: (values: FieldValues) => void | Promise<void>;

	private driver: FormDriver | undefined;
	private ownStore: FormStore | undefined;
	private ownDriver: OwnFormDriver | undefined;
	private drivenStore: FormStateStore | undefined;
	/** The binding `connect` made for the injected store, or `undefined` while the form uses its own. */
	private injected: BoundStore | undefined;
	/** The binding of the form's own store with the plain `formatError` property. */
	private ownBinding: BoundStore | undefined;
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
				refresh: () => entry.handle.refresh(),
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
		this.syncNativeTarget();
	}

	/**
	 * Copy `action` and `method` onto the native `<form>`, which the view renders once
	 * with their first values, so a later change still reaches the form that submits.
	 */
	@onUpdated(['action', 'method'])
	syncNativeTarget(): void {
		const formEl = this.queryNativeForm();
		if (!formEl) {
			return;
		}
		setOptionalAttribute(formEl, 'action', this.action);
		setOptionalAttribute(formEl, 'method', this.method);
	}

	/**
	 * Focus the first registered field among `paths`, in document order. Unknown paths
	 * are ignored and nothing happens when none has a field.
	 *
	 * @remarks Fields come from the form's own registrations, never from a tag name, so
	 * a `RuiField` subclass under another tag is found. Named `focusField`, not
	 * `focus`, so the element keeps `HTMLElement.focus`.
	 */
	focusField(paths: readonly string[]): void {
		let first: FieldRegistration | undefined;
		for (const { registration } of this.registrations) {
			if (
				paths.includes(registration.name) &&
				(!first ||
					first.element.compareDocumentPosition(registration.element) & Node.DOCUMENT_POSITION_PRECEDING)
			) {
				first = registration;
			}
		}
		first?.focus?.();
	}

	/** Submit the native `<form>` to its `action` and `method`; does nothing when neither is set. */
	private submitNatively(): void {
		if (this.action || this.method) {
			this.queryNativeForm()?.submit();
		}
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
			Promise.resolve()
				.then(() => {
					driver.sync();
					return binding.submit({ submitNatively: () => this.submitNatively() });
				})
				.catch((error: unknown) => reportError(error));
			return;
		}
		this.submitOwnPath(driver).catch((error: unknown) => reportError(error));
	}

	private async submitOwnPath(driver: FormDriver): Promise<void> {
		driver.sync();
		await driver.handleSubmit(
			async (values) => {
				this.submitEvent.emit({ values });
				if (typeof this.onSubmit === 'function') {
					await this.onSubmit(values);
					return;
				}
				this.submitNatively();
			},
			(errors, error) => {
				this.invalidEvent.emit(error === undefined ? { errors } : { errors, error });
			},
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

	/** The store `formContext` exposes: the injected one, else the form's own. */
	private resolveStateStore(): FormStateStore | undefined {
		return this.drivenStore ?? this.ownStore;
	}

	/**
	 * Returns the driver for the connected store, switching drivers when it changed.
	 *
	 * @remarks A switch unregisters every control from the old driver and registers it
	 * into the new one, which writes the new store's values into the controls. The
	 * form's own {@link FormStore} is created once and reused when the injected
	 * store is removed, with its earlier values, errors, touched fields and submitted
	 * flag. A disconnected form binds no driver, so it holds no store subscription.
	 */
	private ensureDriver(): FormDriver {
		const injected = this.injected?.store;
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
			this.ownDriver ??= new OwnFormDriver(this.ownStore);
			this.driver = this.ownDriver;
			if (this.ownBinding?.store !== this.ownStore) {
				this.refreshOwnBinding();
			}
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

	/** The binding in use: the connected store's, else the form's own store with `formatError`. */
	private binding(): BoundStore | undefined {
		return this.injected ?? this.ownBinding;
	}

	private refreshOwnBinding(): void {
		this.ownBinding = this.ownStore
			? new StoreBinding<FieldError>(this.ownStore, { formatError: this.formatError })
			: undefined;
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
	 * Hand the form a store it does not own, with the handlers that work with the
	 * store's own issue type: the formatter's `issue` is typed from `store`, so a store
	 * whose entries carry more than `FieldError` needs no cast. This is the only way to
	 * inject a store.
	 *
	 * @remarks The element builds a {@link StoreBinding} that holds the store and the
	 * handlers together, so an issue goes from the store's snapshot to `formatError`
	 * with its type intact. Calling `connect` again replaces the binding: for the same
	 * store only the handlers change, and for another store every control is registered
	 * into it and takes its values.
	 *
	 * @returns A disposer that returns the form to its own store, in the state that
	 * store was left in: its values, errors, touched fields and submitted flag, or a
	 * fresh store built from `defaultValues` if the form never had one. It does
	 * nothing once another `connect` replaced this one.
	 */
	connect<TIssue extends FieldError>(
		store: FormStateStore<TIssue>,
		handlers: RuiFormHandlers<TIssue> = {},
	): () => void {
		const binding = new StoreBinding(store, handlers);
		this.injected = binding;
		this.ensureDriver();
		this.publishFormContext({ force: true });
		return () => {
			if (this.injected !== binding) {
				return;
			}
			this.injected = undefined;
			this.ensureDriver();
			this.publishFormContext({ force: true });
		};
	}

	/**
	 * Write the controls the user changed into the store and report every control's
	 * native validity. The form calls it before the submit handler and before its own
	 * validation; call it before validating through the store yourself.
	 */
	sync(): void {
		this.ensureDriver().sync();
	}

	@onUpdated(['formatError'])
	syncFormatError(): void {
		this.refreshOwnBinding();
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
		try {
			driver?.reset();
		} catch (error) {
			reportError(error);
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'rui-form': RuiForm;
	}
}
