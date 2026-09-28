/// <reference types="node" />

import { AsyncLocalStorage } from 'node:async_hooks';

/** Minimal `AsyncLocalStorage` surface used by SSR ambient state helpers. */
export type NodeAsyncLocalStorage<T> = Pick<AsyncLocalStorage<T>, 'enterWith' | 'getStore' | 'run'>;

export function createNodeAsyncLocalStorage<T>(): NodeAsyncLocalStorage<T> {
	return new AsyncLocalStorage<T>();
}

/**
 * Lazily creates one module-owned ALS instance.
 * Call once per SSR subsystem so store types do not share a generic binding.
 * Relies on Node resolving a single module instance (do not inline duplicates in SSR bundles).
 */
export function createLazyNodeAsyncLocalStorage<T>(): () => NodeAsyncLocalStorage<T> {
	let resolved: NodeAsyncLocalStorage<T> | undefined;

	return () => {
		if (resolved === undefined) {
			resolved = createNodeAsyncLocalStorage<T>();
		}

		return resolved;
	};
}
