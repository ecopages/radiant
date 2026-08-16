import { createContext } from '@ecopages/radiant/context';
import type { FieldError, FieldRegistration, RegisterOptions } from './types';

/** UI slice for one field, computed by `<rui-form>` from the store. */
export type FormFieldPresentation = {
	error?: string;
	invalid: boolean;
};

export type FormContextActions = {
	register: (registration: FieldRegistration) => () => void;
	updateFieldOptions: (name: string, options: RegisterOptions) => void;
	handleFieldChange: (name: string) => void;
	handleFieldBlur: (name: string) => void;
	/** Notified whenever the form publishes a new presentation snapshot. */
	subscribePresentation: (listener: (value: FormContextValue) => void) => () => void;
};

export type FormContextValue = {
	/** False until `<rui-form>` has created its store and bound real actions. */
	ready: boolean;
	/** Bumps when form store state changes. */
	revision: number;
	/** Per-field messages and invalid flags; only the form writes this map. */
	fields: Record<string, FormFieldPresentation>;
	/** Current validation errors keyed by field name, including errors not yet displayed by the validation mode. */
	errors: Partial<Record<string, FieldError>>;
	/** Registration and validation triggers; fields call these instead of touching the store. */
	actions: FormContextActions;
};

export const formContext = createContext<FormContextValue>(Symbol.for('rui-form-context'));
