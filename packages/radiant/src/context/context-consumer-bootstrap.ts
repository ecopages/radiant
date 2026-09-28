import type { ContextHostLike } from './context-host';
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
	host: ContextHostLike,
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
export function bootstrapSsrContextSelection<TContext extends UnknownContext, Selected = ContextType<TContext>>(
	host: object,
	context: TContext,
	callback: (value: Selected) => void,
	select?: (context: ContextType<TContext>) => Selected,
): boolean {
	return registerAndResolveConsumerBootstrap(host, () => {
		if (select) {
			return initializeContextSelection(context, { callback, select });
		}

		return initializeContextSelection(context, {
			callback: callback as (value: ContextType<TContext>) => void,
		});
	});
}

/**
 * Resolves a consumed context from SSR when available, otherwise requests it
 * through the DOM event channel for the current client-side lifecycle pass.
 *
 * @returns `true` when the value was satisfied synchronously from SSR state.
 */
export function connectConsumedContext(
	host: ContextHostLike,
	context: UnknownContext,
	assign: ConsumedContextAssignment,
	options: { emitMounted?: boolean } = {},
): boolean {
	if (initializeConsumedContext(host, context, assign, options)) {
		return true;
	}

	return requestConsumedContext(host, context, assign, options);
}

/**
 * Resolves a selected context value from SSR when available, otherwise requests
 * it through the DOM event channel for the current client-side lifecycle pass.
 *
 * @returns `true` when the value was satisfied synchronously from SSR state.
 */
export function connectContextSelection<TContext extends UnknownContext, Selected = ContextType<TContext>>(
	host: ContextHostLike,
	context: TContext,
	callback: (value: Selected) => void,
	options: {
		select?: (context: ContextType<TContext>) => Selected;
		subscribe?: boolean;
		onSubscribe?: (unsubscribe: () => void) => void;
	} = {},
): boolean {
	if (options.select) {
		const request = { callback, select: options.select };

		if (initializeContextSelection(context, request)) {
			return true;
		}

		return requestContextSelection(host, context, request, {
			subscribe: options.subscribe,
			onSubscribe: options.onSubscribe,
		});
	}

	const request = {
		callback: callback as (value: ContextType<TContext>) => void,
	};

	if (initializeContextSelection(context, request)) {
		return true;
	}

	return requestContextSelection(host, context, request, {
		subscribe: options.subscribe,
		onSubscribe: options.onSubscribe,
	});
}

function registerAndResolveConsumerBootstrap<TResult>(host: object, resolve: () => TResult): TResult {
	registerSsrPreparationCallback(host, resolve);
	return resolve();
}
