import type { FormStateStore } from './form-state-store';
import type { FieldError } from './types';

/** What `RuiForm` hands a {@link RuiFormSubmitHandler}. */
export type RuiFormSubmitContext<TIssue extends FieldError = FieldError> = {
	/** The injected store, with the controls' values flushed into it and their facts reported. */
	store: FormStateStore<TIssue>;
	/** Focuses the control registered for a path, for the host to move focus to the first invalid field. */
	focus: (path: string) => void;
	/** Submits the native `<form>` to its `action` and `method`; does nothing when neither is set. */
	submitNatively: () => void;
};

/**
 * Called on submit instead of the form's own validate-then-emit path.
 *
 * @remarks Only with an injected store. The host validates, counts attempts,
 * focuses and submits; the form emits neither `rui-submit` nor `rui-invalid`. A
 * rejection is reported with `reportError`.
 */
export type RuiFormSubmitHandler<TIssue extends FieldError = FieldError> = (
	context: RuiFormSubmitContext<TIssue>,
) => void | Promise<void>;

/** What `RuiForm` hands a {@link RuiFormResetHandler}. */
export type RuiFormResetContext<TIssue extends FieldError = FieldError> = {
	/** The injected store. */
	store: FormStateStore<TIssue>;
};

/**
 * Called on the native `reset` event instead of resetting the store.
 *
 * @remarks Only with an injected store. The host restores its own state, and the
 * form then rewrites every control from the store, again after the browser's own
 * reset. A rejection is reported with `reportError`.
 */
export type RuiFormResetHandler<TIssue extends FieldError = FieldError> = (
	context: RuiFormResetContext<TIssue>,
) => void | Promise<void>;

/**
 * Produces the text for an error or a warning from its type and params, so an issue
 * with no message of its own is never shown blank.
 *
 * @remarks A result that is empty falls back to the issue's `message`.
 */
export type RuiFormFormatError<TIssue extends FieldError = FieldError> = (
	issue: TIssue,
	field: { path: string },
) => string;

/** The handlers `connect` takes, typed by the store's own issue type. */
export type RuiFormHandlers<TIssue extends FieldError = FieldError> = {
	formatError?: RuiFormFormatError<TIssue>;
	submitHandler?: RuiFormSubmitHandler<TIssue>;
	resetHandler?: RuiFormResetHandler<TIssue>;
};
