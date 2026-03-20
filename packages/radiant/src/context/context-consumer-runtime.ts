import type { RadiantElement } from '../core/radiant-element';
import { resolveSsrContextProvider } from './context-ssr';
import { ContextEventsTypes, ContextRequestEvent, ContextSubscriptionRequestEvent } from './events';
import type { ContextType, UnknownContext } from './types';

type ConsumedContextAssignment = (provider: unknown) => void;

/**
 * Resolves a consumed context from the active SSR provider stack when one is available.
 *
 * This keeps SSR-specific lookup outside decorator implementations while preserving
 * the same consumer initialization contract for both standard and legacy decorators.
 *
 * @returns `true` when the context was resolved synchronously from SSR state.
 */
export function initializeConsumedContext(
	host: RadiantElement,
	context: UnknownContext,
	assign: ConsumedContextAssignment,
	options: { emitMounted?: boolean } = {},
): boolean {
	const provider = resolveSsrContextProvider(context);

	if (!provider) {
		return false;
	}

	assign(provider);
	host.connectedContextCallback(context);

	if (options.emitMounted) {
		host.dispatchEvent(new CustomEvent(ContextEventsTypes.MOUNTED, { detail: provider }));
	}

	return true;
}

/**
 * Requests a context provider through the DOM event channel when SSR state is not active.
 */
export function requestConsumedContext(
	host: RadiantElement,
	context: UnknownContext,
	assign: ConsumedContextAssignment,
	options: { emitMounted?: boolean } = {},
): void {
	host.dispatchEvent(
		new ContextRequestEvent(context, (provider) => {
			assign(provider);
			host.connectedContextCallback(context);

			if (options.emitMounted) {
				host.dispatchEvent(new CustomEvent(ContextEventsTypes.MOUNTED, { detail: provider }));
			}
		}),
	);
}

/**
 * Resolves a selected context value from the active SSR provider stack when available.
 *
 * @returns `true` when the selection callback was satisfied synchronously from SSR state.
 */
export function initializeContextSelection<TContext extends UnknownContext>(
	context: TContext,
	callback: (value: unknown) => void,
	select?: (context: ContextType<TContext>) => unknown,
): boolean {
	const provider = resolveSsrContextProvider(context);

	if (!provider) {
		return false;
	}

	const resolvedContext = provider.getContext() as ContextType<TContext>;
	callback(select ? select(resolvedContext) : resolvedContext);
	return true;
}

/**
 * Requests a selected context value through the DOM event channel.
 */
export function requestContextSelection<TContext extends UnknownContext>(
	host: RadiantElement,
	context: TContext,
	callback: (value: unknown) => void,
	options: {
		select?: (context: ContextType<TContext>) => unknown;
		subscribe?: boolean;
	},
): void {
	host.dispatchEvent(new ContextSubscriptionRequestEvent(context, callback, options.select, options.subscribe));
}
