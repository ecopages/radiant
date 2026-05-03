import type { Method } from '../types';

/**
 * A debounced function with imperative helpers for controlling pending work.
 *
 * @typeParam T The wrapped callback type.
 */
export interface DebouncedFunction<T extends Method> {
	(...args: Parameters<T>): void;

	/**
	 * Cancels the pending callback invocation, if one exists.
	 */
	cancel(): void;

	/**
	 * Immediately invokes the latest pending callback invocation.
	 *
	 * @returns The callback result when a call is pending, or the last completed
	 * result when no call is pending.
	 */
	flush(): ReturnType<T> | undefined;

	/**
	 * Reports whether the callback currently has a scheduled invocation.
	 *
	 * @returns True when a call is pending.
	 */
	pending(): boolean;
}

/**
 * Creates a debounced wrapper around a function.
 *
 * The returned function delays invocation until the configured timeout has
 * elapsed since the latest call. It also exposes helpers to cancel, flush,
 * and inspect pending work.
 *
 * @typeParam T The wrapped callback type.
 * @param callback The callback to debounce.
 * @param timeout The debounce timeout in milliseconds.
 * @returns A debounced wrapper around the callback.
 */
export function debounce<T extends Method>(callback: T, timeout: number): DebouncedFunction<T> {
	let timeoutRef: ReturnType<typeof setTimeout> | null = null;
	let pendingInvocation: (() => ReturnType<T>) | null = null;
	let lastResult: ReturnType<T> | undefined;

	const clearPendingCall = () => {
		if (timeoutRef !== null) {
			clearTimeout(timeoutRef);
			timeoutRef = null;
		}
	};

	const invoke = (): ReturnType<T> | undefined => {
		if (pendingInvocation === null) {
			return lastResult;
		}

		const invocation = pendingInvocation;
		pendingInvocation = null;
		clearPendingCall();
		lastResult = invocation();

		return lastResult;
	};

	const debounced = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
		pendingInvocation = () => callback.apply(this, args) as ReturnType<T>;
		clearPendingCall();
		timeoutRef = setTimeout(() => {
			invoke();
		}, timeout);
	} as DebouncedFunction<T>;

	debounced.cancel = () => {
		clearPendingCall();
		pendingInvocation = null;
	};

	debounced.flush = () => {
		if (pendingInvocation === null) {
			return lastResult;
		}

		return invoke();
	};

	debounced.pending = () => pendingInvocation !== null;

	return debounced;
}
