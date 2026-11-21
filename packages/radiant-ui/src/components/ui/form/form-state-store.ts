import type { FieldError } from './types';

/**
 * Immutable view of an injected store. A new object is returned only when state
 * changed, so `getSnapshot()` can be compared by identity.
 */
export type FormStateStoreSnapshot<TIssue extends FieldError = FieldError> = {
	/** Nested value tree. A field named `profile.name` reads `values.profile.name`. */
	readonly values: Readonly<Record<string, unknown>>;
	/**
	 * The errors the store shows, keyed by dotted path. They block submit, and
	 * `<rui-form>` presents each on the registered control with that path. Keys with
	 * no registered control, such as a form-level key, are ignored: the host renders
	 * them itself. An entry may carry fields beyond `type` and `message`.
	 */
	readonly errors: Readonly<Record<string, TIssue>>;
	/**
	 * Advice the store shows, keyed by dotted path like `errors`. A warning never
	 * blocks submit; `<rui-form>` presents it beside the control without marking the
	 * control invalid.
	 */
	readonly warnings: Readonly<Record<string, TIssue>>;
};

/**
 * What one control's own validity reports, as `ElementInternals` and the constraint
 * validation API do: a fact about the control, not an error to show.
 */
export type NativeValidity = {
	/** The failing `ValidityState` flag: `valueMissing`, `typeMismatch`, `tooShort`, `patternMismatch`, `rangeUnderflow`, ... */
	type: string;
	/** The constraint the control failed, for a message: `{ minLength: 8 }`, `{ min: 1 }`, `{ max: 10 }`, `{ pattern: '[a-z]+' }`. */
	params?: Record<string, unknown>;
	/** The control's `validationMessage`; a fallback for when the store has no better text. */
	message?: string;
};

/** Options on a call that carries the native validity of the control it describes. */
export type FormStateNativeOptions = {
	/**
	 * The control's validity at the time of the call: a fact, or `null` when the
	 * control reports valid. Absent when the form did not read the control.
	 */
	native?: NativeValidity | null;
};

/** Options on `blur`: the control's fact, and its value when the user changed it since the last synchronisation. */
export type FormStateBlurOptions = FormStateNativeOptions & {
	/** Present only when the user changed the control; the store writes it as `setValue` would, in the same call. */
	value?: unknown;
};

/**
 * The state `<rui-form>` drives when a host owns form state. Assign an instance to
 * the form's `store` property; without one the form creates its own `FormStore`,
 * which satisfies the type and nests values the same way.
 *
 * Paths are dotted field names (`address.street`), the same string a `rui-field`
 * carries as its `name`.
 *
 * `TIssue` is the store's own error and warning entry. It extends the minimal
 * {@link FieldError}, so a store can keep `source`, `ruleId`, `all` and whatever else
 * it needs, and `rui-form`'s `connect` types `formatError` with it, no cast.
 *
 * @remarks
 * With an injected store the store owns validation timing, touched and dirty
 * state, defaults, which errors and warnings show and how errors from different
 * origins combine. `<rui-form>` is a control bridge: it keeps control registration,
 * the control value bridge, native validity reading, ARIA and presentation, submit
 * and `FormData`. It presents `getSnapshot().errors` and `warnings` as the store
 * gives them, and ignores its own `mode` and `revalidate-mode`, field
 * `defaultValue`, `defaultValues`, `resolver` and field `rules`.
 *
 * Native validity always travels in the same call as the value or event it
 * describes, so a store never holds a fact older than the value it validates: a
 * `setValue` without `native` carries no fact, and a store must not reuse the one
 * it held for that path. On `validate`, the `native` record is authoritative: it
 * holds the fact of every control the form bridges, `null` for a valid one, and a
 * store drops any fact it held for a path the record does not list.
 *
 * Each member is here because `<rui-form>` calls it:
 * - `getValue` seeds a control when it registers and compares controls with the
 *   store on every notification.
 * - `setValue` receives a control's value on change and on submit for a control
 *   the user changed, replacing the branch at `path`.
 * - `blur` reports that a control lost focus, with its value when the user changed
 *   it, so the store can run its own touched and validation-on-blur policy in one call.
 * - `getSnapshot` and `subscribe` publish presentation and the submit values.
 * - `reportNative` reports a control's validity on its own, after a store write changed it.
 * - `reset` backs the native `reset` event when no `resetHandler` is set; the form
 *   then rewrites controls from the store.
 * - `validate` runs on submit when no `submitHandler` is set and decides whether
 *   `rui-submit` or `rui-invalid` follows.
 *
 * Not required: `checkValidity()` and `touched` / `dirty` in the snapshot (the
 * store keeps them for its own policy). A store may still expose them.
 */
export interface FormStateStore<TIssue extends FieldError = FieldError> {
	/** Read the value at a dotted path; `undefined` when the branch is absent. */
	getValue(path: string): unknown;
	/**
	 * Replace the branch at a dotted path with `value`, creating parents as needed,
	 * and notify when state changed.
	 */
	setValue(path: string, value: unknown, options?: FormStateNativeOptions): void;
	/**
	 * Mark `path` touched and run any validation the store ties to blur. Notifies
	 * when state changed.
	 */
	blur(path: string, options?: FormStateBlurOptions): void;
	/** Stable snapshot; the same object until state changes. */
	getSnapshot(): FormStateStoreSnapshot<TIssue>;
	/** Register a change listener; returns its unsubscribe. */
	subscribe(listener: () => void): () => void;
	/**
	 * Restore initial values and clear errors, warnings and field state, including
	 * every native fact. Notifies when state changed.
	 *
	 * @remarks `<rui-form>` calls it without arguments, then rewrites every control from the store.
	 */
	reset(): void;
	/**
	 * Validate `paths`, or the whole tree when omitted, and resolve with whether that
	 * scope is valid: `false` when the store holds any error at the validated paths,
	 * whether or not it shows it. Warnings do not count.
	 *
	 * @remarks The form calls it without paths on submit. `options.native` holds the
	 * current validity of every control it registers, `null` for a valid one, and is
	 * authoritative: the store drops any fact it held for a path the record omits,
	 * such as a control that was removed.
	 */
	validate(paths?: string[], options?: { native?: Record<string, NativeValidity | null> }): Promise<boolean>;
	/**
	 * Report the native validity of a control on its own, with no value or event: the
	 * form calls it after the store wrote a value into the control, because the
	 * control now says something new about the value the store holds.
	 *
	 * @remarks The store binds the fact to the value it holds at `path`, re-validates
	 * the path only if it was already validated or failed (so a report never counts
	 * as a user change, and a reset is not shown as an error), and ignores a path it
	 * does not hold, such as a row that was removed.
	 */
	reportNative(path: string, native: NativeValidity | null): void;
}
