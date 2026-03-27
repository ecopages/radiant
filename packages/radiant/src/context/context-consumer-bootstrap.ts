import type { RadiantElement } from '../core/radiant-element';
import { registerSsrPreparationCallback } from '../core/ssr-preparation';
import {
	initializeConsumedContext,
	initializeContextSelection,
	requestConsumedContext,
	requestContextSelection,
} from './context-consumer-runtime';
import type { ContextType, UnknownContext } from './types';

type ConsumedContextAssignment = (provider: unknown) => void;

/**
 * Resolves a consumed context immediately and registers the same resolution to
 * run again during the later SSR preparation phase.
 *
 * This keeps constructor-time state and pre-serialization state aligned after
 * instance fields, props, or authored host content change during SSR setup.
 */
export function bootstrapSsrConsumedContext(
	host: RadiantElement,
	context: UnknownContext,
	assign: ConsumedContextAssignment,
	options: { emitMounted?: boolean } = {},
): boolean {
	return registerAndResolveConsumerBootstrap(host, () => initializeConsumedContext(host, context, assign, options));
}

/**
 * Resolves a selected context value immediately and registers the same
 * selection for the later SSR preparation phase.
 *
 * This lets nested SSR renders recompute selector-backed state after the host
 * has finished construction and any server-side configuration hooks have run.
 */
export function bootstrapSsrContextSelection<TContext extends UnknownContext>(
	host: object,
	context: TContext,
	callback: (value: unknown) => void,
	select?: (context: ContextType<TContext>) => unknown,
): boolean {
	return registerAndResolveConsumerBootstrap(host, () => initializeContextSelection(context, callback, select));
}

/**
 * Resolves a consumed context from SSR when available, otherwise requests it
 * through the DOM event channel for the current client-side lifecycle pass.
 *
 * @returns `true` when the value was satisfied synchronously from SSR state.
 */
export function connectConsumedContext(
	host: RadiantElement,
	context: UnknownContext,
	assign: ConsumedContextAssignment,
	options: { emitMounted?: boolean } = {},
): boolean {
	if (initializeConsumedContext(host, context, assign, options)) {
		return true;
	}

	requestConsumedContext(host, context, assign, options);
	return false;
}

/**
 * Resolves a selected context value from SSR when available, otherwise requests
 * it through the DOM event channel for the current client-side lifecycle pass.
 *
 * @returns `true` when the value was satisfied synchronously from SSR state.
 */
export function connectContextSelection<TContext extends UnknownContext>(
	host: RadiantElement,
	context: TContext,
	callback: (value: unknown) => void,
	options: {
		select?: (context: ContextType<TContext>) => unknown;
		subscribe?: boolean;
	} = {},
): boolean {
	if (initializeContextSelection(context, callback, options.select)) {
		return true;
	}

	requestContextSelection(host, context, callback, options);
	return false;
}

function registerAndResolveConsumerBootstrap<TResult>(host: object, resolve: () => TResult): TResult {
	registerSsrPreparationCallback(host, resolve);
	return resolve();
}