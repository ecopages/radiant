import type { FieldError } from './types';

/**
 * Immutable view of an injected store. A new object is returned only when state
 * changed, so `getSnapshot()` can be compared by identity.
 */
export type FormStateSnapshot = {
	/** Nested value tree. A field named `profile.name` reads `values.profile.name`. */
	readonly values: Readonly<Record<string, unknown>>;
	/** Errors keyed by dotted path, merged across every source by the store. */
	readonly errors: Readonly<Record<string, FieldError>>;
};

/**
 * The state `<rui-form>` drives when a host owns form state. Assign an instance to
 * the form's `store` property; without one the form creates its own `FormStore`,
 * which satisfies the type but keeps values flat, so `profile.name` is one literal key.
 *
 * Paths are dotted field names (`address.street`), the same string a `rui-field`
 * carries as its `name`.
 *
 * @remarks
 * With an injected store the store owns validation timing, touched and dirty
 * state, defaults and which errors show. `<rui-form>` is a control bridge: it
 * keeps control registration, the control value bridge, native validity, ARIA and
 * error presentation, submit and `FormData`, and presents exactly the errors in
 * the snapshot. It ignores its own `mode` and `revalidate-mode`, field
 * `defaultValue`, `defaultValues`, `resolver` and field `rules`.
 *
 * Each member is here because `<rui-form>` calls it:
 * - `getValue` seeds a control when it registers and compares controls with the
 *   store on every notification and before each write.
 * - `setValue` receives a control's value on change, on blur and on submit, for
 *   every control that differs from the store, replacing the branch at `path`.
 * - `blur` reports that a control lost focus, after its value was written, so the
 *   store can run its own touched and validation-on-blur policy.
 * - `getSnapshot` and `subscribe` publish presentation and the submit values.
 * - `reset` backs the native `reset` event; the form then rewrites controls from the store.
 * - `validate` runs on submit and decides whether `rui-submit` or `rui-invalid` follows.
 * - `setErrors` carries native control validity under the
 *   {@link FORM_NATIVE_ERROR_SOURCE} source, re-read from the controls and sent
 *   on every change, blur and submit.
 *
 * Not required: `checkValidity()` (the form never needs validity without
 * presenting it) and `touched` / `dirty` in the snapshot (the store keeps them for
 * its own policy). A store may still expose them for its own consumers.
 */
export interface FormStateStore {
	/** Read the value at a dotted path; `undefined` when the branch is absent. */
	getValue(path: string): unknown;
	/** Replace the branch at a dotted path with `value`, creating parents as needed, and notify when state changed. */
	setValue(path: string, value: unknown): void;
	/** Mark `path` touched and run any validation the store ties to blur. Notifies when state changed. */
	blur(path: string): void;
	/** Stable snapshot; the same object until state changes. */
	getSnapshot(): FormStateSnapshot;
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
	 * scope is valid: `false` when any error from any source remains at the
	 * validated paths.
	 *
	 * @remarks The form calls it without paths on submit, after sending the `native`
	 * source. It must count `native` errors and must not clear errors another
	 * source set.
	 */
	validate(paths?: string[]): Promise<boolean>;
	/**
	 * Replace every error contributed by `source` with `errors`; an empty record
	 * clears the source. Notifies when state changed. How sources merge, for example
	 * which message wins on one path, is the store's decision.
	 */
	setErrors(source: string, errors: Record<string, FieldError>): void;
}

/**
 * Source name `<rui-form>` passes to `setErrors` for native control validity
 * (`ElementInternals.setValidity`) read from form-associated controls.
 */
export const FORM_NATIVE_ERROR_SOURCE = 'native';
