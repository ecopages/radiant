import type { FormDriver } from './form-driver';
import type { FormStore } from './form-store';
import type { FieldError, FieldRegistration, FieldRegistrationHandle, FieldValues, RegisterOptions } from './types';

const NO_WARNINGS: Readonly<Record<string, FieldError>> = Object.freeze({});

/**
 * Drives the form's own {@link FormStore} as a {@link FormDriver}, so the store
 * itself exposes no member that only the form calls.
 *
 * @remarks The store reads its registered controls directly whenever it validates, so
 * there is nothing for `sync` to write or report, and it has no source of warnings.
 */
export class OwnFormDriver implements FormDriver {
	constructor(readonly store: FormStore) {}

	get errors(): Partial<Record<string, FieldError>> {
		return this.store.errors;
	}

	get warnings(): Partial<Record<string, FieldError>> {
		return NO_WARNINGS;
	}

	subscribe(listener: () => void): () => void {
		return this.store.subscribe(listener);
	}

	getRevision(): number {
		return this.store.getRevision();
	}

	register(registration: FieldRegistration): FieldRegistrationHandle {
		return this.store.register(registration);
	}

	updateFieldOptions(name: string, options: RegisterOptions): void {
		this.store.updateFieldOptions(name, options);
	}

	getRegisteredFieldNames(): string[] {
		return this.store.getRegisteredFieldNames();
	}

	shouldDisplayFieldError(name: string): boolean {
		return this.store.shouldDisplayFieldError(name);
	}

	handleFieldChange(name: string): Promise<void> {
		return this.store.handleFieldChange(name);
	}

	handleFieldBlur(name: string): Promise<void> {
		return this.store.handleFieldBlur(name);
	}

	handleSubmit(
		onValid: (values: FieldValues) => void | Promise<void>,
		onInvalid?: (errors: Partial<Record<string, FieldError>>, error?: unknown) => void,
	): Promise<void> {
		return this.store.handleSubmit(onValid, onInvalid);
	}

	reset(): void {
		this.store.reset();
	}

	sync(): void {}
}
