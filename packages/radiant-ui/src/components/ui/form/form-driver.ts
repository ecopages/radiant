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
	/** Move the registration named `from` to `registration.name`, keeping its state. */
	renameField(from: string, registration: FieldRegistration): void;
	updateFieldOptions(name: string, options: RegisterOptions): void;
	getRegisteredFieldNames(): string[];
	getFieldError(name: string): string | undefined;
	shouldDisplayFieldError(name: string): boolean;
	handleFieldChange(name: string): Promise<void>;
	handleFieldBlur(name: string): Promise<void>;
	/**
	 * Validate, then run `onValid` or `onInvalid`.
	 *
	 * @remarks A validation that throws calls `onInvalid` with the current errors and
	 * the thrown value as `error`, and resolves. A rejection from `onValid` rejects.
	 */
	handleSubmit(
		onValid: (values: FieldValues) => void | Promise<void>,
		onInvalid?: (errors: Partial<Record<string, FieldError>>, error?: unknown) => void,
	): Promise<void>;
	reset(): void;
}
