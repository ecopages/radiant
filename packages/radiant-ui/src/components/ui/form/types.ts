export type ValidationMode = 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all';

export type FieldValues = Record<string, unknown>;

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

export type FieldRegistration = RegisterOptions & {
	name: string;
	getValue: () => unknown;
	setValue: (value: unknown) => void;
	getRules?: () => FieldRules | undefined;
	onBlur?: () => void;
	onChange?: () => void;
};
