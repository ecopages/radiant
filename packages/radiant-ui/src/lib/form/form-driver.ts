import type { FieldError, FieldRegistration, FieldRegistrationHandle, FieldValues, RegisterOptions } from './types';

/**
 * What `<rui-form>` needs from the object that registers its controls and runs
 * validation. {@link FormStore} is one implementation; `InjectedFormDriver` adapts a
 * host {@link FormStateStore}.
 */
export interface FormDriver {
	subscribe(listener: () => void): () => void;
	getRevision(): number;
	readonly errors: Partial<Record<string, FieldError>>;
	/** Advice that never blocks submit; empty for the built-in store. */
	readonly warnings: Partial<Record<string, FieldError>>;
	register(registration: FieldRegistration): FieldRegistrationHandle;
	updateFieldOptions(name: string, options: RegisterOptions): void;
	getRegisteredFieldNames(): string[];
	/** The element of the field registered for `path`, when it supplied one. */
	getFieldElement(path: string): Element | undefined;
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
	/** Focus the control registered for `path`; nothing happens for a path with no control. */
	focus(path: string): void;
	reset(): void;
	/**
	 * Write the controls the user changed into the store and report every control's
	 * native validity, so the store holds the current state before it validates.
	 */
	sync(): void;
}
