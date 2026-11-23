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

/**
 * What a validation of the whole tree concluded.
 *
 * @remarks `passed` means no error, so the form emits `rui-submit`. `invalid` means the
 * store holds an error, so the form emits `rui-invalid` with the snapshot's errors.
 * `overtaken` means a newer write superseded the check before it concluded, so it says
 * nothing about the values: the form ends the submission without an event and the user
 * submits again.
 */
export type FormStateValidateResult = { outcome: 'passed' } | { outcome: 'invalid' } | { outcome: 'overtaken' };

/**
 * The state `<rui-form>` drives when a host owns form state. Hand an instance to
 * `form.connect`; without one the form creates its own `FormStore`, which satisfies
 * the type and nests values the same way.
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
 * Native validity is pushed, never pulled. `<rui-form>` calls `reportNative` with
 * the fact of each control whenever its value or presence changes, from either
 * side, after the change has settled: right after `setValue` for a user change
 * (so before `blur`), and through a microtask for a store write, a reset, a
 * rename, a control that connects, and a control that disconnects (`null`, unless
 * another live control is bound to that path, as when rows move). A fact is
 * `null` for a valid control. A store binds each fact to the value it holds at
 * that path and drops it when the path is reported `null` or removed.
 *
 * Each member is here because `<rui-form>` calls it:
 * - `getValue` seeds a control when it registers and compares controls with the
 *   store on every notification.
 * - `setValue` receives a control's value on change and on submit for a control
 *   the user changed, replacing the branch at `path`.
 * - `blur` reports that a control lost focus, so the store can run its own
 *   touched and validation-on-blur policy.
 * - `reportNative` receives control facts, keyed by path.
 * - `getSnapshot` and `subscribe` publish presentation and the submit values.
 * - `reset` backs the native `reset` event when no `resetHandler` is set; the form
 *   then rewrites controls from the store and reports their facts again.
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
	setValue(path: string, value: unknown): void;
	/**
	 * Mark `path` touched and run any validation the store ties to blur. Notifies
	 * when state changed.
	 */
	blur(path: string): void;
	/**
	 * Report the native validity of controls, keyed by dotted path: a fact, or `null`
	 * for a valid control or one that left the form.
	 *
	 * @remarks The store binds each fact to the value it holds at its path and keeps
	 * it until the path is reported again. A report never counts as a user change:
	 * re-validate a path only if it was already validated or failed, so a reset is
	 * not shown as an error. Ignore a fact for a path the store does not hold, such
	 * as a row that was removed.
	 */
	reportNative(facts: Record<string, NativeValidity | null>): void;
	/** Stable snapshot; the same object until state changes. */
	getSnapshot(): FormStateStoreSnapshot<TIssue>;
	/** Register a change listener; returns its unsubscribe. */
	subscribe(listener: () => void): () => void;
	/**
	 * Restore initial values and clear errors, warnings and field state, including
	 * every native fact. Notifies when state changed.
	 *
	 * @remarks `<rui-form>` calls it without arguments, then rewrites every control
	 * from the store and reports their facts again.
	 */
	reset(): void;
	/**
	 * Validate the whole tree and resolve with the outcome: `invalid` when the store
	 * holds any error, whether or not it shows it. Warnings do not count.
	 *
	 * @remarks The form calls it on submit when no `submitHandler` is set, after `sync()`
	 * reported every control's fact. A boolean is not an outcome: resolve the object.
	 */
	validate(): Promise<FormStateValidateResult>;
}
