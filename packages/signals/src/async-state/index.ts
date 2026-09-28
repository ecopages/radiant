import { state } from '../state';
import { watch } from '../watch';
import type { Signal } from '../types';

/** Lifecycle status of an async operation. */
export type AsyncStatus = 'idle' | 'pending' | 'success' | 'error';

/** Options passed to the fetcher function. */
export interface AsyncStateFetcherOptions {
	signal: AbortSignal;
}

type UnsourcedFetcher<T> = (options: AsyncStateFetcherOptions) => Promise<T>;
type SourcedFetcher<S, T> = (sourceValue: S, options: AsyncStateFetcherOptions) => Promise<T>;

interface AsyncStateBaseConfig<T> {
	/** Seed value for `data` before the first successful resolution. */
	initialValue?: T;

	/**
	 * Milliseconds a successful response is considered fresh. While fresh,
	 * source changes that resolve to an already-cached key skip the network
	 * entirely and serve the cached value synchronously.
	 *
	 * Defaults to `0` (always refetch). Set to `Infinity` to cache forever.
	 *
	 * Only meaningful for sourced queries — the source value is serialized
	 * with `JSON.stringify` to produce the cache key.
	 */
	staleTime?: number;

	/**
	 * Milliseconds to wait before transitioning `status` to `'pending'`.
	 *
	 * If the response arrives within this window the status jumps straight
	 * from its previous value to `'success'` or `'error'`, avoiding a
	 * flash-of-loading-state for fast responses.
	 *
	 * Defaults to `0` (transition immediately).
	 */
	pendingDelay?: number;

	/** Called after each successful resolution, including cache hits. */
	onSuccess?: (data: T) => void;

	/** Called after each failed resolution. Not called for aborted requests. */
	onError?: (error: unknown) => void;

	/**
	 * Called after each resolution, whether successful or failed.
	 *
	 * Exactly one of `data` / `error` is defined per call.
	 */
	onSettled?: (data: T | undefined, error: unknown) => void;
}

/** Configuration for an unsourced `asyncState` that fetches immediately. */
export interface AsyncStateConfig<T> extends AsyncStateBaseConfig<T> {
	fetcher: UnsourcedFetcher<T>;
	source?: undefined;
}

/** Configuration for a sourced `asyncState` driven by a reactive source. */
export interface AsyncStateSourcedConfig<S, T> extends AsyncStateBaseConfig<T> {
	/**
	 * Reactive source function. The fetcher is invoked whenever `source`
	 * emits a new truthy value. Falsy values (`false`, `null`, `undefined`)
	 * disable fetching and preserve the current state.
	 */
	source: () => S | false | null | undefined;

	fetcher: SourcedFetcher<S, T>;
}

/** Reactive handle returned by `asyncState`. */
export interface AsyncStateResult<T> {
	/** Latest resolved value. Retains last success while refetching. */
	readonly data: Signal<T | undefined>;

	/** Current lifecycle status. */
	readonly status: Signal<AsyncStatus>;

	/** Latest error. Cleared when a new fetch starts. */
	readonly error: Signal<unknown>;

	/** Trigger a new fetch, aborting any in-flight request. */
	refetch(): void;

	/** Abort the current in-flight request without changing status. */
	abort(): void;

	/** Dispose all subscriptions and abort any pending request. */
	dispose(): void;
}

/**
 * Creates a reactive async state that fetches immediately on creation.
 *
 * Call `.refetch()` to re-execute. The previous in-flight request is aborted
 * automatically and `AbortError` exceptions are silently discarded.
 */
export function asyncState<T>(config: AsyncStateConfig<T>): AsyncStateResult<T>;

/**
 * Creates a reactive async state driven by a reactive `source`.
 *
 * The fetcher is invoked whenever `source` emits a new truthy value. Falsy
 * values (`false`, `null`, `undefined`) disable fetching and preserve the
 * current state.
 */
export function asyncState<S, T>(config: AsyncStateSourcedConfig<S, T>): AsyncStateResult<T>;

export function asyncState<S, T>(config: AsyncStateConfig<T> | AsyncStateSourcedConfig<S, T>): AsyncStateResult<T> {
	const hasSource = config.source !== undefined;
	const source = hasSource ? (config as AsyncStateSourcedConfig<S, T>).source : undefined;
	const fetcher = config.fetcher as UnsourcedFetcher<T> | SourcedFetcher<S, T>;

	const staleTime = config.staleTime ?? 0;
	const pendingDelay = config.pendingDelay ?? 0;

	const dataState = state<T | undefined>(config.initialValue);
	const statusState = state<AsyncStatus>('idle');
	const errorState = state<unknown>(undefined);

	const cache = new Map<string, { value: T; timestamp: number }>();

	let activeController: AbortController | null = null;
	let requestVersion = 0;
	let pendingTimer: ReturnType<typeof setTimeout> | undefined;
	const disposers: (() => void)[] = [];

	const clearPendingTimer = () => {
		if (pendingTimer !== undefined) {
			clearTimeout(pendingTimer);
			pendingTimer = undefined;
		}
	};

	const commitPending = () => {
		pendingTimer = undefined;
		statusState.set('pending');
	};

	const schedulePending = () => {
		clearPendingTimer();
		errorState.set(undefined);

		if (pendingDelay <= 0) {
			statusState.set('pending');
			return;
		}

		pendingTimer = setTimeout(commitPending, pendingDelay);
	};

	const execute = (sourceValue?: S) => {
		const canUseCache = hasSource && staleTime > 0;
		const cacheKey = hasSource ? JSON.stringify(sourceValue) : '';

		if (canUseCache) {
			const cached = cache.get(cacheKey);
			if (cached && Date.now() - cached.timestamp < staleTime) {
				requestVersion += 1;
				activeController?.abort();
				activeController = null;
				clearPendingTimer();
				dataState.set(cached.value);
				statusState.set('success');
				errorState.set(undefined);
				config.onSuccess?.(cached.value);
				config.onSettled?.(cached.value, undefined);
				return;
			}
		}

		const version = ++requestVersion;

		activeController?.abort();
		activeController = new AbortController();

		schedulePending();

		const controller = activeController;
		const fetcherOptions: AsyncStateFetcherOptions = { signal: controller.signal };

		const promise = hasSource
			? (fetcher as SourcedFetcher<S, T>)(sourceValue as S, fetcherOptions)
			: (fetcher as UnsourcedFetcher<T>)(fetcherOptions);

		promise.then(
			(value) => {
				if (version !== requestVersion || controller.signal.aborted) return;
				clearPendingTimer();

				if (canUseCache) {
					cache.set(cacheKey, { value, timestamp: Date.now() });
				}

				dataState.set(value);
				statusState.set('success');
				activeController = null;
				config.onSuccess?.(value);
				config.onSettled?.(value, undefined);
			},
			(err) => {
				if (version !== requestVersion || controller.signal.aborted) return;
				if (err instanceof DOMException && err.name === 'AbortError') return;
				clearPendingTimer();
				errorState.set(err);
				statusState.set('error');
				activeController = null;
				config.onError?.(err);
				config.onSettled?.(undefined, err);
			},
		);
	};

	if (source) {
		const stopWatch = watch(
			source,
			(value) => {
				if (value === false || value === null || value === undefined) return;
				execute(value as S);
			},
			{ immediate: true },
		);
		disposers.push(stopWatch);
	} else {
		execute();
	}

	return {
		data: dataState,
		status: statusState,
		error: errorState,
		refetch() {
			if (source) {
				const value = source();
				if (value === false || value === null || value === undefined) return;
				execute(value as S);
			} else {
				execute();
			}
		},
		abort() {
			activeController?.abort();
			activeController = null;
		},
		dispose() {
			clearPendingTimer();
			activeController?.abort();
			activeController = null;
			for (const fn of disposers) fn();
			disposers.length = 0;
		},
	};
}
