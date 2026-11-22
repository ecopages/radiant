import type { FieldError } from './types';

/** What `RuiForm` hands a {@link RuiFormSubmitHandler}. */
export type RuiFormSubmitContext = {
	/** Submits the native `<form>` to its `action` and `method`; does nothing when neither is set. */
	submitNatively: () => void;
};

/**
 * Called on submit instead of the form's own validate-then-emit path, after the form
 * wrote the changed controls into the store and reported their facts.
 *
 * @remarks Only with an injected store. The host validates, counts attempts and
 * submits, and moves focus with `rui-form.focusField(paths)`; the form emits neither
 * `rui-submit` nor `rui-invalid`. A rejection is reported with `reportError`.
 */
export type RuiFormSubmitHandler = (context: RuiFormSubmitContext) => void | Promise<void>;

/**
 * Called on the native `reset` event instead of resetting the store.
 *
 * @remarks Only with an injected store. The host restores its own state, and the
 * form then rewrites every control from the store, again after the browser's own
 * reset. A rejection is reported with `reportError`.
 */
export type RuiFormResetHandler = () => void | Promise<void>;

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

/** The handlers `connect` takes; `formatError` is typed by the store's own issue type. */
export type RuiFormHandlers<TIssue extends FieldError = FieldError> = {
	formatError?: RuiFormFormatError<TIssue>;
	submitHandler?: RuiFormSubmitHandler;
	resetHandler?: RuiFormResetHandler;
};
