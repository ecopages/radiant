import { createRulesResolver } from './resolvers';
import type {
	FieldError,
	FieldRegistration,
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
	resolver?: Resolver<T>;
	mode?: ValidationMode;
	reValidateMode?: ValidationMode;
};

type InternalField = FieldRegistration & {
	rules?: FieldRules;
	defaultValue?: unknown;
	getRules?: () => FieldRules | undefined;
};

function normalizeResolver<T extends FieldValues>(resolver: unknown): Resolver<T> {
	if (typeof resolver === 'function') {
		return resolver as Resolver<T>;
	}
	return createRulesResolver<T>();
}

export class FormStore<T extends FieldValues = FieldValues> {
	mode: ValidationMode;
	reValidateMode: ValidationMode;
	private resolver: Resolver<T>;
	private readonly fields = new Map<string, InternalField>();
	private listeners = new Set<() => void>();
	private revision = 0;
	private defaultValues: Partial<T>;

	values: T;
	errors: Partial<Record<keyof T, FieldError>> = {};
	touched: Partial<Record<keyof T, boolean>> = {};
	dirty: Partial<Record<keyof T, boolean>> = {};
	isSubmitting = false;
	isSubmitted = false;

	constructor(options: FormStoreOptions<T> = {}) {
		this.mode = options.mode ?? 'onSubmit';
		this.reValidateMode = options.reValidateMode ?? 'onChange';
		this.resolver = normalizeResolver(options.resolver);
		this.defaultValues = { ...(options.defaultValues ?? {}) } as Partial<T>;
		this.values = { ...this.defaultValues, ...(options.values ?? {}) } as T;
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
			this.defaultValues = { ...(options.defaultValues as Partial<T>) };
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

	register(registration: FieldRegistration): () => void {
		const existing = this.fields.get(registration.name);
		const entry: InternalField = {
			...registration,
			rules: registration.rules ?? existing?.rules,
			defaultValue: registration.defaultValue ?? existing?.defaultValue,
			getRules: registration.getRules ?? existing?.getRules,
		};
		this.fields.set(registration.name, entry);

		if (this.values[registration.name as keyof T] === undefined && entry.defaultValue !== undefined) {
			this.values = { ...this.values, [registration.name]: entry.defaultValue } as T;
		}

		entry.setValue(this.values[registration.name as keyof T]);

		return () => {
			const current = this.fields.get(registration.name);
			if (current === entry) {
				this.fields.delete(registration.name);
				this.notify();
			}
		};
	}

	updateFieldOptions(name: string, options: RegisterOptions): void {
		const field = this.fields.get(name);
		if (!field) {
			return;
		}
		if (options.rules !== undefined) {
			field.rules = options.rules;
		}
		if (options.defaultValue !== undefined) {
			field.defaultValue = options.defaultValue;
		}
	}

	getValues(): T {
		const next = { ...this.values } as T;
		for (const [name, field] of this.fields) {
			next[name as keyof T] = field.getValue() as T[keyof T];
		}
		return next;
	}

	setValue(name: keyof T, value: unknown, options?: { shouldDirty?: boolean; shouldTouch?: boolean }): void {
		this.values = { ...this.values, [name]: value } as T;
		const field = this.fields.get(String(name));
		field?.setValue(value);
		if (options?.shouldDirty) {
			this.dirty = { ...this.dirty, [name]: true };
		}
		if (options?.shouldTouch) {
			this.touched = { ...this.touched, [name]: true };
		}
		this.notify();
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
			const next = { ...this.errors };
			delete next[name as keyof T];
			this.errors = next;
			this.notify();
			return;
		}
		this.errors = {};
		this.notify();
	}

	getFieldError(name: string): string | undefined {
		return this.errors[name as keyof T]?.message;
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

	async validateField(name: string): Promise<boolean> {
		const values = this.getValues();
		const result = await this.resolver(values, { fields: this.buildResolverFields() }, { names: [name] });
		const message = result.errors[name as keyof T]?.message;
		const next = { ...this.errors };
		if (message) {
			next[name as keyof T] = { type: 'validation', message };
		} else {
			delete next[name as keyof T];
		}
		this.errors = next;
		this.notify();
		return !message;
	}

	async validateAll(): Promise<boolean> {
		const values = this.getValues();
		const result = await this.resolver(values, { fields: this.buildResolverFields() }, {});
		this.errors = result.errors as Partial<Record<keyof T, FieldError>>;
		this.notify();
		return Object.keys(this.errors).length === 0;
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
				return trigger === 'blur' && Boolean(this.touched[name as keyof T]);
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
		this.values = { ...this.values, [name]: value } as T;
		this.dirty = { ...this.dirty, [name]: true };
		if (this.shouldValidate(name, 'change')) {
			await this.validateField(name);
		} else {
			this.notify();
		}
	}

	async handleFieldBlur(name: string): Promise<void> {
		this.markTouched(name);
		if (this.shouldValidate(name, 'blur')) {
			await this.validateField(name);
		} else {
			this.notify();
		}
	}

	/** Whether a field's validation message should be shown in the UI (RHF-style). */
	shouldDisplayFieldError(name: string): boolean {
		const message = this.errors[name as keyof T]?.message;
		if (!message) {
			return false;
		}
		if (this.isSubmitted) {
			return true;
		}

		switch (this.mode) {
			case 'all':
				return Boolean(this.dirty[name as keyof T] || this.touched[name as keyof T]);
			case 'onChange':
				return Boolean(this.dirty[name as keyof T]);
			case 'onBlur':
			case 'onTouched':
				return Boolean(this.touched[name as keyof T]);
			case 'onSubmit':
			default:
				return false;
		}
	}

	async handleSubmit(
		onValid: (values: T) => void | Promise<void>,
		onInvalid?: (errors: Partial<Record<keyof T, FieldError>>) => void,
	): Promise<void> {
		this.isSubmitting = true;
		this.isSubmitted = true;

		for (const name of this.fields.keys()) {
			this.touched = { ...this.touched, [name]: true };
		}
		this.notify();

		const valid = await this.validateAll();
		this.isSubmitting = false;
		this.notify();

		if (valid) {
			await onValid(this.getValues());
			return;
		}

		onInvalid?.(this.errors);
	}

	reset(values?: Partial<T>): void {
		const nextDefaults = values ?? { ...this.defaultValues, ...this.collectFieldDefaults() };
		this.values = { ...nextDefaults } as T;
		this.errors = {};
		this.touched = {};
		this.dirty = {};
		this.isSubmitted = false;
		this.isSubmitting = false;
		for (const field of this.fields.values()) {
			field.setValue(this.values[field.name as keyof T]);
		}
		this.notify();
	}

	private collectFieldDefaults(): Partial<T> {
		const defaults: Partial<T> = {};
		for (const [name, field] of this.fields) {
			if (field.defaultValue !== undefined) {
				defaults[name as keyof T] = field.defaultValue as T[keyof T];
			}
		}
		return defaults;
	}

	private buildResolverFields(): Record<string, { rules?: FieldRules }> {
		const fields: Record<string, { rules?: FieldRules }> = {};
		for (const [name, field] of this.fields) {
			const rules = field.getRules?.() ?? field.rules;
			fields[name] = { rules };
		}
		return fields;
	}
}
