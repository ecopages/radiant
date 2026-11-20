import type { FormStoreOptions } from './form-store';
import type { FieldError, FieldRegistration, FieldValues, RegisterOptions } from './types';

/**
 * What `<rui-form>` needs from the object that registers its controls and runs
 * validation. {@link FormStore} is one implementation; `InjectedFormDriver` adapts a
 * host {@link FormStateStore}.
 */
export interface FormDriver {
	subscribe(listener: () => void): () => void;
	getRevision(): number;
	readonly errors: Partial<Record<string, FieldError>>;
	register(registration: FieldRegistration): () => void;
	updateFieldOptions(name: string, options: RegisterOptions): void;
	updateOptions(options: FormStoreOptions<FieldValues>): void;
	getRegisteredFieldNames(): string[];
	getFieldError(name: string): string | undefined;
	shouldDisplayFieldError(name: string): boolean;
	handleFieldChange(name: string): Promise<void>;
	handleFieldBlur(name: string): Promise<void>;
	handleSubmit(
		onValid: (values: FieldValues) => void | Promise<void>,
		onInvalid?: (errors: Partial<Record<string, FieldError>>) => void,
	): Promise<void>;
	reset(): void;
}
