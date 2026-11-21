export type ValidationMode = 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all';

export type FieldValues = Record<string, unknown>;

/**
 * An error at one field path.
 *
 * @remarks Both members are optional, and an entry may carry other fields, which
 * the form leaves alone. The presence of an entry in an errors record is what
 * makes a field invalid (`aria-invalid`, a failed `validate`, a blocked submit);
 * a missing or empty `message` shows no text.
 */
export type FieldError = {
	type?: string;
	/** The constraint behind `type`, for a message: `{ minLength: 8 }`. */
	params?: Record<string, unknown>;
	message?: string;
	/** Where the error came from, such as `native`, `validation` or `server`. */
	source?: string;
};

export type FieldRules = {
	required?: boolean | string;
	min?: number | { value: number; message: string };
	max?: number | { value: number; message: string };
	minLength?: number | { value: number; message: string };
	maxLength?: number | { value: number; message: string };
	pattern?: RegExp | { value: RegExp; message: string };
	validate?:
		| ((value: unknown, values: FieldValues) => boolean | string | Promise<boolean | string>)
		| Record<string, (value: unknown, values: FieldValues) => boolean | string | Promise<boolean | string>>;
};

export type ResolverSuccess<T extends FieldValues> = {
	values: T;
	errors: Record<string, never>;
};

export type ResolverError<_T extends FieldValues> = {
	values: Record<string, never>;
	errors: Partial<Record<string, FieldError>>;
};

export type ResolverResult<T extends FieldValues> = ResolverSuccess<T> | ResolverError<T>;

export type Resolver<T extends FieldValues = FieldValues> = (
	values: T,
	context: ResolverContext,
	options: ResolverOptions<T>,
) => ResolverResult<T> | Promise<ResolverResult<T>>;

export type ResolverContext = {
	names?: string[];
	fields: Record<string, { rules?: FieldRules }>;
};

export type ResolverOptions<_T extends FieldValues> = {
	criteriaMode?: 'firstError' | 'all';
	names?: string[];
};

export type FormState<T extends FieldValues = FieldValues> = {
	values: T;
	errors: Partial<Record<string, FieldError>>;
	touched: Partial<Record<string, boolean>>;
	dirty: Partial<Record<string, boolean>>;
	isSubmitting: boolean;
	isSubmitted: boolean;
	isValid: boolean;
};

export type RegisterOptions = {
	rules?: FieldRules;
	defaultValue?: unknown;
	shouldUnregister?: boolean;
};

/** A control's own validity, as `ElementInternals.setValidity` reports it. */
export type FieldControlValidity = {
	valid: boolean;
	/** The failing `ValidityState` flag (`valueMissing`, `typeMismatch`, ...); `customError` when a reader gave none. */
	type?: string;
	/** The constraint the control failed, such as `{ minLength: 8 }`. */
	params?: Record<string, unknown>;
	/** The control's own `validationMessage`, when it has one. */
	message?: string;
};

/**
 * What registering a field returns. It identifies the registration itself, not its
 * name, so it stays valid when the field is renamed and a swap of two names cannot
 * lose either registration.
 */
export type FieldRegistrationHandle = {
	/** Move this registration to another name, keeping its state; a no-op once removed. */
	rename(name: string): void;
	/** Remove this registration; a no-op once removed. */
	unregister(): void;
};

export type FieldRegistration = RegisterOptions & {
	/** The name at registration time; later names come from {@link FieldRegistrationHandle.rename}. */
	name: string;
	getValue: () => unknown;
	setValue: (value: unknown) => void;
	getRules?: () => FieldRules | undefined;
	/** Read at validation time; an invalid result adds a `native` error when no rule or resolver error exists. */
	getValidity?: () => FieldControlValidity | undefined;
	/** Move focus to this field's control. */
	focus?: () => void;
	onBlur?: () => void;
	onChange?: () => void;
};
