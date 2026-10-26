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
 * Registers consumed-context resolution for the host's SSR preparation pass.
 *
 * @remarks Delivery waits until `prepareForSsr`, after instance fields exist and before `@onUpdated`
 * callbacks, so a constructor-time write is not overwritten by `@state` field initialization. Client
 * hosts still connect through {@link connectConsumedContext}.
 */
export function bootstrapSsrConsumedContext(
	host: ContextHostLike,
	context: UnknownContext,
	assign: ConsumedContextAssignment,
	options: { emitMounted?: boolean } = {},
): void {
	registerSsrPreparationCallback(
		host,
		() => {
			initializeConsumedContext(host, context, assign, options);
		},
		true,
	);
}

/**
 * Registers context selection for the host's SSR preparation pass.
 *
 * @remarks Delivery runs during SSR preparation after construction and before `@onUpdated` callbacks, so
 * `@contextSelector` and `@onContextUpdate` see the provider value at that point. Client hosts still
 * connect through {@link connectContextSelection}.
 */
export function bootstrapSsrContextSelection<TContext extends UnknownContext, Selected = ContextType<TContext>>(
	host: object,
	context: TContext,
	callback: (value: Selected) => void,
	select?: (context: ContextType<TContext>) => Selected,
): void {
	registerSsrPreparationCallback(
		host,
		() => {
			if (select) {
				initializeContextSelection(context, { callback, select });
				return;
			}

			initializeContextSelection(context, {
				callback: callback as (value: ContextType<TContext>) => void,
			});
		},
		true,
	);
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
