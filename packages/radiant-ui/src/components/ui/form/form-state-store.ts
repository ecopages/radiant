import type { FieldError } from './types';

/**
 * Immutable view of an injected store. A new object is returned only when state
 * changed, so `getSnapshot()` can be compared by identity.
 */
export type FormStateStoreSnapshot = {
	/** Nested value tree. A field named `profile.name` reads `values.profile.name`. */
	readonly values: Readonly<Record<string, unknown>>;
	/**
	 * The errors the store shows, keyed by dotted path. `<rui-form>` presents each one
	 * on the registered control with that path and ignores keys it has no control for,
	 * such as a form-level key. An entry may carry fields beyond `type` and `message`.
	 */
	readonly errors: Readonly<Record<string, FieldError>>;
};

/**
 * What one control's own validity reports, as `ElementInternals` and the constraint
 * validation API do: a fact about the control, not an error to show.
 */
export type NativeValidity = {
	/** The failing `ValidityState` flag: `valueMissing`, `typeMismatch`, `tooShort`, `patternMismatch`, `rangeUnderflow`, ... */
	type: string;
	/** The control's `validationMessage`, when it has one. */
	message?: string;
};

/**
 * The state `<rui-form>` drives when a host owns form state. Assign an instance to
 * the form's `store` property; without one the form creates its own `FormStore`,
 * which satisfies the type and nests values the same way.
 *
 * Paths are dotted field names (`address.street`), the same string a `rui-field`
 * carries as its `name`.
 *
 * @remarks
 * With an injected store the store owns validation timing, touched and dirty
 * state, defaults, which errors show and how errors from different origins
 * combine. `<rui-form>` is a control bridge: it keeps control registration, the
 * control value bridge, native validity reading, ARIA and error presentation,
 * submit and `FormData`. It presents `getSnapshot().errors` as the store gives
 * it, and ignores its own `mode` and `revalidate-mode`, field `defaultValue`,
 * `defaultValues`, `resolver` and field `rules`.
 *
 * Each member is here because `<rui-form>` calls it:
 * - `getValue` seeds a control when it registers and compares controls with the
 *   store on every notification.
 * - `setValue` receives a control's value on change, on blur and on submit, for
 *   every control the user changed, replacing the branch at `path`.
 * - `blur` reports that a control lost focus, after its value was written, so the
 *   store can run its own touched and validation-on-blur policy.
 * - `getSnapshot` and `subscribe` publish presentation and the submit values.
 * - `reset` backs the native `reset` event when no `resetHandler` is set; the form
 *   then rewrites controls from the store.
 * - `validate` runs on submit when no `submitHandler` is set and decides whether
 *   `rui-submit` or `rui-invalid` follows.
 * - `setNativeValidity` reports what the controls' own validity says, so the
 *   store can treat it as an input to its validation with the same timing as its
 *   own rules.
 *
 * Not required: `checkValidity()` and `touched` / `dirty` in the snapshot (the
 * store keeps them for its own policy). A store may still expose them.
 */
export interface FormStateStore {
	/** Read the value at a dotted path; `undefined` when the branch is absent. */
	getValue(path: string): unknown;
	/** Replace the branch at a dotted path with `value`, creating parents as needed, and notify when state changed. */
	setValue(path: string, value: unknown): void;
	/** Mark `path` touched and run any validation the store ties to blur. Notifies when state changed. */
	blur(path: string): void;
	/** Stable snapshot; the same object until state changes. */
	getSnapshot(): FormStateStoreSnapshot;
	/** Register a change listener; returns its unsubscribe. */
	subscribe(listener: () => void): () => void;
	/**
	 * Restore initial values and clear errors and field state. Notifies when state changed.
	 *
	 * @remarks `<rui-form>` calls it without arguments, then rewrites every control from the store.
	 */
	reset(): void;
	/**
	 * Validate `paths`, or the whole tree when omitted, and resolve with whether that
	 * scope is valid: `false` when the store holds any error at the validated paths,
	 * whether or not it shows it.
	 *
	 * @remarks The form calls it without paths on submit, after reporting native
	 * validity. Native validity counts, as does every other error the store holds.
	 */
	validate(paths?: string[]): Promise<boolean>;
	/**
	 * Replace the validity facts of the form's controls. `validity` holds one entry
	 * for each control that is currently invalid, keyed by path; a path with no entry
	 * is valid, and an empty record means every control is valid.
	 *
	 * @remarks The form calls it before the `setValue`, `blur` or `validate` call it
	 * accompanies, and when a control is renamed or removed, so one user change is
	 * one notification: the store applies the facts to the next validation and
	 * display decision, and need not notify for them alone.
	 */
	setNativeValidity(validity: Record<string, NativeValidity>): void;
}
