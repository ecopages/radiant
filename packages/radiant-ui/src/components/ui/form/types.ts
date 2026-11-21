export type ValidationMode = 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all';

export type FieldValues = Record<string, unknown>;

/**
 * An error at one field path.
 *
 * @remarks Both members are optional. The presence of an entry in an errors record
 * is what makes a field invalid: an entry whose `message` is missing or empty marks
 * the field invalid (`aria-invalid`, a failed `validate`, a blocked submit) and
 * shows no text, unless another source reported a message for the same path, which
 * is then shown: a missing or empty message never hides one. The built-in
 * `FormStore` applies this everywhere, and an injected store is expected to.
 */
export type FieldError = {
	type?: string;
	message?: string;
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

export type ResolverError<T extends FieldValues> = {
	values: Record<string, never>;
	errors: Partial<Record<keyof T, FieldError>>;
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
	errors: Partial<Record<keyof T, FieldError>>;
	touched: Partial<Record<keyof T, boolean>>;
	dirty: Partial<Record<keyof T, boolean>>;
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
export type FieldControlValidity = { valid: boolean; message?: string };

export type FieldRegistration = RegisterOptions & {
	name: string;
	getValue: () => unknown;
	setValue: (value: unknown) => void;
	getRules?: () => FieldRules | undefined;
	/** Read at validation time; an invalid result adds a `native` error when no rule or resolver error exists. */
	getValidity?: () => FieldControlValidity | undefined;
	onBlur?: () => void;
	onChange?: () => void;
};
