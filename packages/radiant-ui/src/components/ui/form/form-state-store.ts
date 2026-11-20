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
 * Radiant UI keeps what only the DOM can answer: control registration, reading
 * native control validity, the control value bridge, touched and dirty bookkeeping
 * for validation timing, submit state, and error presentation. The store holds
 * values and errors only, so it has no `isSubmitting` or registration members.
 *
 * Each member is here because `<rui-form>` calls it:
 * - `getValue` seeds a control when it registers and compares a control with the
 *   store on every notification.
 * - `setValue` receives a control's typed value, replacing the branch at `path`, and
 *   a control's own default when the store has no value at registration.
 * - `getSnapshot` and `subscribe` publish presentation and the submit values.
 * - `reset` backs the native `reset` event; the form then rewrites controls from the store.
 * - `validate` runs the store's own validation; `<rui-form>` decides when from `mode`.
 * - `setErrors` lets the form contribute errors the store cannot see: native
 *   control validity under the {@link FORM_NATIVE_ERROR_SOURCE} source.
 *
 * Not required: `checkValidity()` (a silent validity read), because the form never
 * needs validity without also presenting it, and `touched` / `dirty` in the snapshot,
 * because validation timing depends on blur and change events only the form sees.
 * A store may still expose them for its own consumers.
 */
export interface FormStateStore {
	/** Read the value at a dotted path; `undefined` when the branch is absent. */
	getValue(path: string): unknown;
	/** Replace the branch at a dotted path with `value`, creating parents as needed, then notify. */
	setValue(path: string, value: unknown): void;
	/** Stable snapshot; the same object until state changes. */
	getSnapshot(): FormStateSnapshot;
	/** Register a change listener; returns its unsubscribe. */
	subscribe(listener: () => void): () => void;
	/**
	 * Restore initial values, or `values` when given, and clear errors. Must notify.
	 *
	 * @remarks `<rui-form>` calls it without arguments and also clears the `native` source it contributed.
	 */
	reset(values?: Record<string, unknown>): void;
	/**
	 * Validate `paths`, or the whole tree when omitted, and resolve with whether that
	 * scope is valid.
	 *
	 * @remarks It must count errors from every source, including `native` errors the
	 * form set through `setErrors`, and must not clear errors another source set.
	 */
	validate(paths?: string[]): Promise<boolean>;
	/**
	 * Replace every error contributed by `source` with `errors`; an empty record
	 * clears the source. Must notify. How sources merge, for example which message
	 * wins on one path, is the store's decision.
	 */
	setErrors(source: string, errors: Record<string, FieldError>): void;
}

/**
 * Source name `<rui-form>` passes to `setErrors` for native control validity
 * (`ElementInternals.setValidity`) read from form-associated controls.
 */
export const FORM_NATIVE_ERROR_SOURCE = 'native';
