import { createRulesResolver } from './resolvers';
import { isSameValue } from './same-value';
import type {
	FormStateStore,
	FormStateStoreSnapshot,
	FormStateValidateResult,
	NativeValidity,
} from './form-state-store';
import { deletePath, getPath, setPath } from './value-path';
import type {
	FieldError,
	FieldRegistration,
	FieldRegistrationHandle,
	FieldRules,
	FieldValues,
	FormState,
	RegisterOptions,
	Resolver,
	ValidationMode,
} from './types';

export type FormStoreOptions<T extends FieldValues> = {
	defaultValues?: Partial<T>;
	values?: Partial<T>;
	resolver?: Resolver;
	mode?: ValidationMode;
	reValidateMode?: ValidationMode;
};

type InternalField = FieldRegistration & {
	rules?: FieldRules;
	defaultValue?: unknown;
	getRules?: () => FieldRules | undefined;
	/** False once the registration was removed. */
	live: boolean;
	/** State of this entry's old name that another entry took, kept until this entry is renamed. */
	carried?: FieldState;
};

function normalizeResolver(resolver: Resolver | undefined): Resolver {
	return typeof resolver === 'function' ? resolver : createRulesResolver();
}

/** A field default counts only when it is neither `undefined` nor `null` (a bare `rui-field` reports `null`). */
export function hasDefault(value: unknown): boolean {
	return value !== undefined && value !== null;
}

type FieldState = { touched?: boolean; dirty?: boolean; error?: FieldError };

function withKey<V>(record: Record<string, V>, key: string, value: V | undefined): Record<string, V> {
	if (value === undefined) {
		if (!Object.hasOwn(record, key)) {
			return record;
		}
		const { [key]: _removed, ...rest } = record;
		return rest;
	}
	return { ...record, [key]: value };
}

const NO_WARNINGS: Readonly<Record<string, FieldError>> = Object.freeze({});

/**
 * The store `<rui-form>` creates when no store is injected. It also owns control
 * registration and submit state, which a {@link FormStateStore} does not.
 */
export class FormStore<T extends FieldValues = FieldValues> implements FormStateStore {
	mode: ValidationMode;
	reValidateMode: ValidationMode;
	private resolver: Resolver;
	private readonly fields = new Map<string, InternalField>();
	private listeners = new Set<() => void>();
	private revision = 0;
	private defaultValues: FieldValues;

	values: FieldValues;
	private ownErrors: Record<string, FieldError> = {};
	private mergedErrors: Record<string, FieldError> = this.ownErrors;
	private readonly sourceErrors = new Map<string, Record<string, FieldError>>();
	private reportedNative: Record<string, NativeValidity> = {};
	/** Paths whose validation has run since the last reset, whether it passed or failed. */
	private readonly validatedPaths = new Set<string>();
	private readonly validationRuns = new Map<string, { id: number; promise: Promise<FormStateValidateResult> }>();
	private lastValidationId = 0;
	/** The native fact type, or `null` for none, that the last validation of each path read. */
	private readonly validatedNative = new Map<string, string | null>();
	private snapshot:
		{ values: FieldValues; errors: Record<string, FieldError>; value: FormStateStoreSnapshot } | undefined;
	touched: Record<string, boolean> = {};
	dirty: Record<string, boolean> = {};
	isSubmitting = false;
	isSubmitted = false;

	constructor(options: FormStoreOptions<T> = {}) {
		this.mode = options.mode ?? 'onSubmit';
		this.reValidateMode = options.reValidateMode ?? 'onChange';
		this.resolver = normalizeResolver(options.resolver);
		this.defaultValues = { ...options.defaultValues };
		this.values = { ...this.defaultValues, ...options.values };
	}

	/**
	 * Resolver and rule errors merged with errors contributed through `setErrors`.
	 *
	 * @remarks A source error replaces a resolver or rule error on the same field.
	 * Read-only: the getter returns the merged view, so writing it back would turn
	 * source errors into own errors that outlive `setErrors(source, {})`. Write host
	 * errors with `setErrors` and remove them with `clearErrors`.
	 */
	get errors(): Record<string, FieldError> {
		return this.mergedErrors;
	}

	/** Replace the resolver, rule and native errors and re-merge the `setErrors` sources over them. */
	private setOwnErrors(next: Record<string, FieldError>): void {
		this.ownErrors = next;
		this.mergeErrors();
	}

	/**
	 * Own errors (rules, the resolver and native validity) merge with `setErrors`
	 * sources; a host source replaces an own error at the same path, and the source set
	 * most recently wins among sources. No message is borrowed between them.
	 */
	private mergeErrors(): void {
		if (this.sourceErrors.size === 0) {
			this.mergedErrors = this.ownErrors;
			return;
		}
		this.mergedErrors = Object.fromEntries([
			...Object.entries(this.ownErrors),
			...[...this.sourceErrors.values()].flatMap((errors) => Object.entries(errors)),
		]);
	}

	/** Reads a map by name without reaching `Object.prototype`, so a field named `constructor` is not an error. */
	private ownRead<V>(map: Partial<Record<string, V>>, name: string): V | undefined {
		return Object.hasOwn(map, name) ? map[name] : undefined;
	}

	getValue(path: string): unknown {
		const field = this.fields.get(path);
		return field ? field.getValue() : getPath(this.values, path);
	}

	getSnapshot(): FormStateStoreSnapshot {
		if (this.snapshot?.values !== this.values || this.snapshot.errors !== this.mergedErrors) {
			this.snapshot = {
				values: this.values,
				errors: this.mergedErrors,
				value: {
					values: this.values,
					errors: this.mergedErrors,
					warnings: NO_WARNINGS,
				},
			};
		}
		return this.snapshot.value;
	}

	/**
	 * Validate `paths`, or the whole tree when none are given.
	 *
	 * @remarks With `paths`, a run that a newer validation of the same path superseded
	 * while its resolver was pending resolves `overtaken` instead of its stale verdict,
	 * and the newer run resolves the real one. Without `paths` the whole tree is
	 * validated in one run that nothing supersedes, so it resolves `passed` or `invalid`.
	 */
	async validate(paths?: string[]): Promise<FormStateValidateResult> {
		const outcomes: Array<FormStateValidateResult['outcome']> = [];
		if (paths) {
			for (const path of paths) {
				outcomes.push((await this.validatePath(path)).outcome);
			}
		} else {
			outcomes.push((await this.validateAll()) ? 'passed' : 'invalid');
		}
		if (outcomes.includes('overtaken')) {
			return { outcome: 'overtaken' };
		}
		const scope = paths ?? Object.keys(this.mergedErrors);
		return outcomes.includes('invalid') || scope.some((path) => this.ownRead(this.mergedErrors, path))
			? { outcome: 'invalid' }
			: { outcome: 'passed' };
	}

	/**
	 * Contribute errors from another origin, such as a server. Not part of
	 * {@link FormStateStore}: an injected store decides for itself how a host's errors
	 * enter. Replaces every error `source` set before, and an error at a path is
	 * cleared when the user edits that field.
	 */
	setErrors(source: string, errors: Record<string, FieldError>): void {
		this.sourceErrors.delete(source);
		if (Object.keys(errors).length > 0) {
			this.sourceErrors.set(source, { ...errors });
		}
		this.mergeErrors();
		this.notify();
	}

	/** Update options without dropping registered fields. */
	updateOptions(options: FormStoreOptions<T>): void {
		if (options.mode !== undefined) {
			this.mode = options.mode;
		}
		if (options.reValidateMode !== undefined) {
			this.reValidateMode = options.reValidateMode;
		}
		if (options.resolver !== undefined) {
			this.resolver = normalizeResolver(options.resolver);
		}
		if (options.defaultValues !== undefined) {
			this.defaultValues = { ...options.defaultValues };
		}
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.revision += 1;
		for (const listener of this.listeners) {
			listener();
		}
	}

	getRevision(): number {
		return this.revision;
	}

	getRegisteredFieldNames(): string[] {
		return Array.from(this.fields.keys());
	}

	register(registration: FieldRegistration): FieldRegistrationHandle {
		const existing = this.fields.get(registration.name);
		const entry: InternalField = {
			...registration,
			rules: registration.rules ?? existing?.rules,
			defaultValue: hasDefault(registration.defaultValue) ? registration.defaultValue : existing?.defaultValue,
			getRules: registration.getRules ?? existing?.getRules,
			live: true,
		};
		this.fields.set(registration.name, entry);

		if (getPath(this.values, registration.name) === undefined && hasDefault(entry.defaultValue)) {
			this.values = setPath(this.values, registration.name, entry.defaultValue);
		}

		entry.setValue(getPath(this.values, registration.name));

		return {
			rename: (name) => this.renameEntry(entry, name),
			unregister: () => this.removeEntry(entry),
			refresh: () => entry.setValue(getPath(this.values, entry.name)),
		};
	}

	private removeEntry(entry: InternalField): void {
		if (!entry.live) {
			return;
		}
		entry.live = false;
		entry.carried = undefined;
		if (this.fields.get(entry.name) === entry) {
			this.fields.delete(entry.name);
		}
		this.notify();
	}

	/**
	 * Move an entry to `to` with its value and field state.
	 *
	 * @remarks The value comes from the control, which is the truth for a keyed row
	 * that moved. Touched, dirty and own-error state lives under a name, so an entry
	 * whose name another entry takes first carries its state until it is renamed
	 * too: two rows can swap names in two calls without either losing state. The old
	 * name is cleared only when no entry still holds it.
	 */
	private renameEntry(entry: InternalField, to: string): void {
		const from = entry.name;
		if (!entry.live || from === to) {
			return;
		}
		const moved = entry.carried ?? this.readFieldState(from);
		const occupant = this.fields.get(to);
		if (occupant && occupant !== entry && !occupant.carried) {
			occupant.carried = this.readFieldState(to);
		}
		if (this.fields.get(from) === entry) {
			this.fields.delete(from);
		}
		this.fields.set(to, entry);
		entry.name = to;
		entry.carried = undefined;
		if (!this.fields.has(from)) {
			this.values = deletePath(this.values, from);
			this.writeFieldState(from, {});
		}
		const value = entry.getValue();
		this.values = value === undefined ? deletePath(this.values, to) : setPath(this.values, to, value);
		this.writeFieldState(to, moved);
		this.notify();
	}

	/**
	 * Write the stored value into every registered control whose path is `path`, under
	 * it or above it, so replacing a branch reaches the controls inside it and writing
	 * inside a control that holds an object reaches that control.
	 */
	private rewriteRelatedControls(path: string, except?: string): void {
		for (const [name, field] of this.fields) {
			if (name === except) {
				continue;
			}
			if (name === path || name.startsWith(`${path}.`) || path.startsWith(`${name}.`)) {
				field.setValue(getPath(this.values, name));
			}
		}
	}

	private readFieldState(name: string): FieldState {
		return {
			touched: this.ownRead(this.touched, name),
			dirty: this.ownRead(this.dirty, name),
			error: this.ownRead(this.ownErrors, name),
		};
	}

	private writeFieldState(name: string, state: FieldState): void {
		this.touched = withKey(this.touched, name, state.touched);
		this.dirty = withKey(this.dirty, name, state.dirty);
		this.setOwnErrors(withKey(this.ownErrors, name, state.error));
	}

	/**
	 * @remarks A present `defaultValue` key always overwrites, and `null` clears the
	 * field default, so a default that is removed stops winning on reset.
	 */
	updateFieldOptions(name: string, options: RegisterOptions): void {
		const field = this.fields.get(name);
		if (!field) {
			return;
		}
		if (options.rules !== undefined) {
			field.rules = options.rules;
		}
		if ('defaultValue' in options) {
			field.defaultValue = hasDefault(options.defaultValue) ? options.defaultValue : undefined;
		}
	}

	getValues(): FieldValues {
		let next = this.values;
		for (const [name, field] of this.fields) {
			next = setPath(next, name, field.getValue());
		}
		return next;
	}

	/**
	 * Write a value as a change, the way the injected store contract defines it: the
	 * field becomes dirty, validation runs per `mode`, and an error a host set at the
	 * path with `setErrors` is cleared, since the user has now edited that field.
	 */
	setValue(name: string, value: unknown, options?: { shouldTouch?: boolean }): void {
		this.values = setPath(this.values, name, value);
		this.rewriteRelatedControls(name);
		if (options?.shouldTouch) {
			this.touched = { ...this.touched, [name]: true };
		}
		this.afterChange(name).catch((error: unknown) => reportError(error));
	}

	private async afterChange(name: string): Promise<void> {
		this.dirty = { ...this.dirty, [name]: true };
		this.clearSourceErrorsAt(name);
		if (!this.shouldValidate(name, 'change')) {
			this.notify();
			return;
		}
		try {
			await this.validatePath(name);
		} catch (error) {
			this.notify();
			throw error;
		}
	}

	private clearSourceErrorsAt(name: string): void {
		let changed = false;
		for (const [source, errors] of this.sourceErrors) {
			if (Object.hasOwn(errors, name)) {
				const { [name]: _removed, ...rest } = errors;
				if (Object.keys(rest).length > 0) {
					this.sourceErrors.set(source, rest);
				} else {
					this.sourceErrors.delete(source);
				}
				changed = true;
			}
		}
		if (changed) {
			this.mergeErrors();
		}
	}

	markTouched(name: string): void {
		this.touched = { ...this.touched, [name]: true };
		this.notify();
	}

	markDirty(name: string): void {
		this.dirty = { ...this.dirty, [name]: true };
		this.notify();
	}

	clearErrors(name?: string): void {
		if (name) {
			const next = { ...this.ownErrors };
			delete next[name];
			for (const [source, errors] of this.sourceErrors) {
				this.sourceErrors.set(
					source,
					Object.fromEntries(Object.entries(errors).filter(([path]) => path !== name)),
				);
			}
			this.setOwnErrors(next);
			this.notify();
			return;
		}
		this.sourceErrors.clear();
		this.setOwnErrors({});
		this.notify();
	}

	/** The message to show, or `undefined` when the field has no error or its error has no message. */
	getFieldError(name: string): string | undefined {
		return this.ownRead(this.errors, name)?.message || undefined;
	}

	getState(): FormState<T> {
		const values = this.getValues();
		const errorCount = Object.keys(this.errors).length;
		return {
			values,
			errors: this.errors,
			touched: this.touched,
			dirty: this.dirty,
			isSubmitting: this.isSubmitting,
			isSubmitted: this.isSubmitted,
			isValid: errorCount === 0,
		};
	}

	/**
	 * Validate one path and write its error. Resolves `overtaken` for a run that a newer
	 * run for the same path superseded.
	 *
	 * @remarks The latest run for a path wins: a run that another run for the same path
	 * superseded while its resolver was pending writes no error and notifies nobody, so an
	 * out-of-order resolver result never leaves a stale error. The run in flight stays
	 * reachable in `validationRuns` until it settles, which lets a caller wait for it
	 * instead of starting another.
	 */
	private validatePath(name: string): Promise<FormStateValidateResult> {
		const id = ++this.lastValidationId;
		const promise = this.runFieldValidation(name, id);
		this.validationRuns.set(name, { id, promise });
		const clear = () => {
			if (this.validationRuns.get(name)?.id === id) {
				this.validationRuns.delete(name);
			}
		};
		promise.then(clear, clear);
		return promise;
	}

	private async runFieldValidation(name: string, id: number): Promise<FormStateValidateResult> {
		this.validatedPaths.add(name);
		const values = this.getValues();
		const result = await this.resolver(values, { fields: this.buildResolverFields() }, { names: [name] });
		const resolverError: FieldError | undefined = this.ownRead(result.errors, name);
		const nativeError = resolverError?.message ? undefined : this.readNativeError(name);
		const error = nativeError ?? resolverError;
		if (this.validationRuns.get(name)?.id !== id) {
			return { outcome: 'overtaken' };
		}
		this.validatedNative.set(name, nativeError?.type ?? null);
		this.setOwnErrors(withKey(this.ownErrors, name, error ? (nativeError ?? resolverError ?? {}) : undefined));
		this.notify();
		return { outcome: error ? 'invalid' : 'passed' };
	}

	async validateAll(): Promise<boolean> {
		for (const name of new Set([...this.fields.keys(), ...Object.keys(this.reportedNative)])) {
			this.validatedPaths.add(name);
		}
		const values = this.getValues();
		const result = await this.resolver(values, { fields: this.buildResolverFields() }, {});
		const found = new Map<string, FieldError>();
		for (const [path, error] of Object.entries(result.errors)) {
			if (error) {
				found.set(path, error);
			}
		}
		for (const name of new Set([...this.fields.keys(), ...Object.keys(this.reportedNative)])) {
			const native = found.get(name)?.message ? undefined : this.readNativeError(name);
			this.validatedNative.set(name, native?.type ?? null);
			if (native) {
				found.set(name, native);
			}
		}
		this.setOwnErrors(Object.fromEntries(found));
		this.notify();
		return Object.keys(this.mergedErrors).length === 0;
	}

	/**
	 * Bind each control's reported validity to the value held at its path.
	 *
	 * @remarks Never a user change: nothing is marked dirty and no validation runs
	 * unless the path was already validated, whether it passed or failed, or is in a
	 * failed scope, in which case it is validated again so its error follows the
	 * fact. A fact for a path the store does not hold is ignored; `null` is always
	 * recorded, so a removed row leaves no fact behind.
	 */
	reportNative(facts: Record<string, NativeValidity | null>): void {
		for (const [path, native] of Object.entries(facts)) {
			if (native && !this.fields.has(path) && getPath(this.values, path) === undefined) {
				continue;
			}
			this.recordNative(path, native);
			if (this.validatedPaths.has(path) || this.ownRead(this.errors, path)) {
				this.validatePath(path).catch((error: unknown) => reportError(error));
			}
		}
	}

	/**
	 * Keep the native fact a host reports for a path with no control registered here.
	 *
	 * @remarks A registered control is read directly when validating, which is
	 * fresher, so a fact only fills in for a path with no registered control. `null`
	 * clears it.
	 */
	private recordNative(path: string, fact: NativeValidity | null): void {
		if (fact) {
			this.reportedNative = { ...this.reportedNative, [path]: fact };
		} else if (Object.hasOwn(this.reportedNative, path)) {
			const { [path]: _gone, ...rest } = this.reportedNative;
			this.reportedNative = rest;
		}
	}

	/**
	 * @remarks Evaluated after the resolver, so a custom resolver cannot disable it
	 * and a rule or resolver message wins. Reads `validity` data only; it never
	 * calls `checkValidity()`, which fires an `invalid` event.
	 */
	private readNativeError(name: string): FieldError | undefined {
		const reported = this.fields.has(name) ? undefined : this.ownRead(this.reportedNative, name);
		if (reported) {
			return { type: reported.type, params: reported.params, message: reported.message || undefined };
		}
		const validity = this.fields.get(name)?.getValidity?.();
		if (!validity || validity.valid) {
			return undefined;
		}
		return {
			type: validity.type ?? 'customError',
			params: validity.params,
			message: validity.message || undefined,
		};
	}

	shouldValidate(name: string, trigger: 'change' | 'blur'): boolean {
		const mode = this.isSubmitted ? this.reValidateMode : this.mode;

		switch (mode) {
			case 'all':
				return true;
			case 'onChange':
				return trigger === 'change';
			case 'onBlur':
				return trigger === 'blur';
			case 'onTouched':
				return trigger === 'blur' && Boolean(this.ownRead(this.touched, name));
			case 'onSubmit':
				return false;
			default:
				return false;
		}
	}

	async handleFieldChange(name: string): Promise<void> {
		const field = this.fields.get(name);
		if (!field) {
			return;
		}
		const value = field.getValue();
		if (isSameValue(value, getPath(this.values, name))) {
			await this.revalidateUnchanged(name);
			return;
		}
		this.values = setPath(this.values, name, value);
		this.rewriteRelatedControls(name, name);
		await this.afterChange(name);
	}

	/**
	 * A change event whose value the store already holds writes nothing and marks nothing dirty. A control
	 * can still turn valid or invalid without its value moving, so the field is validated again when the
	 * mode asks for validation on change and the control's native fact differs from the one the last
	 * validation of the path read.
	 *
	 * @remarks The comparison is with what validation saw, not with the error shown: a shown rule or
	 * resolver error would never match a control with no native problem, and every change would validate
	 * again. A validation already running for the path reads the control's fact after its resolver
	 * settles, so the change waits for it instead of starting a second run.
	 */
	private async revalidateUnchanged(name: string): Promise<void> {
		if (!this.shouldValidate(name, 'change')) {
			return;
		}
		const running = this.validationRuns.get(name);
		if (running) {
			await running.promise;
			return;
		}
		const current = this.readNativeError(name)?.type ?? null;
		if (current !== (this.validatedNative.get(name) ?? null)) {
			await this.validatePath(name);
		}
	}

	/** Interface form of {@link FormStore.handleFieldBlur}; validation runs per `mode`. */
	blur(path: string): void {
		this.handleFieldBlur(path).catch((error: unknown) => reportError(error));
	}

	async handleFieldBlur(name: string): Promise<void> {
		this.markTouched(name);
		if (this.shouldValidate(name, 'blur')) {
			await this.validatePath(name);
		} else {
			this.notify();
		}
	}

	/** Whether a field's validation message should be shown in the UI (RHF-style). */
	shouldDisplayFieldError(name: string): boolean {
		if (!this.ownRead(this.errors, name)) {
			return false;
		}
		if (this.isSubmitted) {
			return true;
		}

		switch (this.mode) {
			case 'all':
				return Boolean(this.ownRead(this.dirty, name) || this.ownRead(this.touched, name));
			case 'onChange':
				return Boolean(this.ownRead(this.dirty, name));
			case 'onBlur':
			case 'onTouched':
				return Boolean(this.ownRead(this.touched, name));
			case 'onSubmit':
			default:
				return false;
		}
	}

	/**
	 * Validate, then run `onValid` with the values or `onInvalid` with the errors.
	 *
	 * @remarks `isSubmitting` stays true until the whole submission settles,
	 * including an awaited `onValid`, and is always cleared. A validation that
	 * throws counts as invalid: `onInvalid` receives the current errors and the
	 * thrown value as `error`, and the returned promise resolves. A rejection from
	 * `onValid` clears `isSubmitting` and rejects.
	 */
	async handleSubmit(
		onValid: (values: FieldValues) => void | Promise<void>,
		onInvalid?: (errors: Partial<Record<string, FieldError>>, error?: unknown) => void,
	): Promise<void> {
		this.isSubmitting = true;
		this.isSubmitted = true;

		for (const name of this.fields.keys()) {
			this.touched = { ...this.touched, [name]: true };
		}
		this.notify();

		try {
			let valid: boolean;
			try {
				valid = await this.validateAll();
			} catch (error) {
				onInvalid?.(this.errors, error);
				return;
			}
			if (valid) {
				await onValid(this.getValues());
				return;
			}
			onInvalid?.(this.errors);
		} finally {
			this.isSubmitting = false;
			this.notify();
		}
	}

	reset(values?: Partial<T>): void {
		this.values = values ? { ...values } : this.withFieldDefaults({ ...this.defaultValues });
		this.sourceErrors.clear();
		this.reportedNative = {};
		this.validatedPaths.clear();
		this.validatedNative.clear();
		this.setOwnErrors({});
		this.touched = {};
		this.dirty = {};
		this.isSubmitted = false;
		this.isSubmitting = false;
		for (const field of this.fields.values()) {
			field.setValue(getPath(this.values, field.name));
		}
		this.notify();
	}

	/**
	 * @remarks A field without an explicit default reports `null` (the `@prop`
	 * default of `rui-field`). Only a non-null default overrides the form's
	 * `defaultValues`, so a bare field never wipes them on reset.
	 */
	private withFieldDefaults(tree: FieldValues): FieldValues {
		let next = tree;
		for (const [name, field] of this.fields) {
			if (hasDefault(field.defaultValue)) {
				next = setPath(next, name, field.defaultValue);
			}
		}
		return next;
	}

	private buildResolverFields(): Record<string, { rules?: FieldRules }> {
		const fields: Record<string, { rules?: FieldRules }> = Object.create(null);
		for (const [name, field] of this.fields) {
			const rules = field.getRules?.() ?? field.rules;
			fields[name] = { rules };
		}
		return fields;
	}
}
