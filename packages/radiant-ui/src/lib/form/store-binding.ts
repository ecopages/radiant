import type { FormStateStore } from './form-state-store';
import type { RuiFormHandlers, RuiFormResetContext, RuiFormSubmitContext } from './form-handlers';
import type { FieldError } from './types';

/** The parts of a submit context the form supplies; the binding adds the typed `store`. */
export type SubmitHelpers = Omit<RuiFormSubmitContext, 'store'>;

/**
 * What the form needs from a store and its handlers, without naming the store's issue
 * type, so the element can hold a binding for any store.
 */
export interface BoundStore {
	readonly store: FormStateStore;
	readonly hasSubmitHandler: boolean;
	readonly hasResetHandler: boolean;
	/** The text for the error or warning at `path`, or `undefined` when there is none or it has no text. */
	text(kind: 'errors' | 'warnings', path: string): string | undefined;
	submit(helpers: SubmitHelpers): void | Promise<void>;
	reset(): void | Promise<void>;
}

/**
 * Holds a store and the handlers written for its own issue type together, so an
 * issue goes from `getSnapshot()` straight to `formatError` with its type intact and
 * nothing is cast.
 *
 * @remarks `TIssue` appears only inside the binding. `BoundStore`, which the element
 * holds, names no issue type, and the methods that touch one take only paths and
 * non-generic helpers.
 */
export class StoreBinding<TIssue extends FieldError = FieldError> implements BoundStore {
	readonly hasSubmitHandler: boolean;
	readonly hasResetHandler: boolean;

	constructor(
		readonly store: FormStateStore<TIssue>,
		private readonly handlers: RuiFormHandlers<TIssue> = {},
	) {
		this.hasSubmitHandler = typeof handlers.submitHandler === 'function';
		this.hasResetHandler = typeof handlers.resetHandler === 'function';
	}

	text(kind: 'errors' | 'warnings', path: string): string | undefined {
		const issues = this.store.getSnapshot()[kind];
		if (!Object.hasOwn(issues, path)) {
			return undefined;
		}
		const issue = issues[path];
		if (!issue) {
			return undefined;
		}
		const formatted = this.handlers.formatError?.(issue, { path });
		return formatted || issue.message || undefined;
	}

	submit(helpers: SubmitHelpers): void | Promise<void> {
		return this.handlers.submitHandler?.({ store: this.store, ...helpers });
	}

	reset(): void | Promise<void> {
		const context: RuiFormResetContext<TIssue> = { store: this.store };
		return this.handlers.resetHandler?.(context);
	}
}
