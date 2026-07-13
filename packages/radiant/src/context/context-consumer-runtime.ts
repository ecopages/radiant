import type { ContextHostLike } from './context-host';
import { resolveAmbientSsrContextProvider } from './context-ssr-bridge';
import { ContextEventsTypes, ContextRequestEvent, ContextSubscriptionRequestEvent } from './events';
import type { ContextCallback, ContextType, UnknownContext } from './types';

type ConsumedContextAssignment = (provider: unknown) => void;

type DirectContextSelectionRequest<TContext extends UnknownContext> = {
	callback: (value: ContextType<TContext>) => void;
	select?: undefined;
};

type SelectedContextSelectionRequest<TContext extends UnknownContext, Selected> = {
	callback: (value: Selected) => void;
	select: (context: ContextType<TContext>) => Selected;
};

type ContextSelectionRequest<TContext extends UnknownContext, Selected = ContextType<TContext>> =
	DirectContextSelectionRequest<TContext> | SelectedContextSelectionRequest<TContext, Selected>;

/**
 * Resolves a consumed context from the active SSR provider stack when one is available.
 *
 * This keeps SSR-specific lookup outside decorator implementations while preserving
 * the same consumer initialization contract for both standard and legacy decorators.
 *
 * @returns `true` when the context was resolved synchronously from SSR state.
 */
export function initializeConsumedContext(
	host: ContextHostLike,
	context: UnknownContext,
	assign: ConsumedContextAssignment,
	options: { emitMounted?: boolean } = {},
): boolean {
	const provider = resolveAmbientSsrContextProvider(context);

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
	host: ContextHostLike,
	context: UnknownContext,
	assign: ConsumedContextAssignment,
	options: { emitMounted?: boolean } = {},
): boolean {
	const event = new ContextRequestEvent(context, (provider) => {
		assign(provider);
		host.connectedContextCallback(context);

		if (options.emitMounted) {
			host.dispatchEvent(new CustomEvent(ContextEventsTypes.MOUNTED, { detail: provider }));
		}
	});

	host.dispatchEvent(event);
	return event.handled;
}

/**
 * Resolves a selected context value from the active SSR provider stack when available.
 *
 * @returns `true` when the selection callback was satisfied synchronously from SSR state.
 */
export function initializeContextSelection<TContext extends UnknownContext>(
	context: TContext,
	request: DirectContextSelectionRequest<TContext>,
): boolean;
export function initializeContextSelection<TContext extends UnknownContext, Selected>(
	context: TContext,
	request: SelectedContextSelectionRequest<TContext, Selected>,
): boolean;
export function initializeContextSelection<TContext extends UnknownContext, Selected = ContextType<TContext>>(
	context: TContext,
	request: ContextSelectionRequest<TContext, Selected>,
): boolean {
	const provider = resolveAmbientSsrContextProvider(context);

	if (!provider) {
		return false;
	}

	const resolvedContext = provider.getContext() as ContextType<TContext>;

	if (request.select) {
		request.callback(request.select(resolvedContext));
		return true;
	}

	request.callback(resolvedContext);
	return true;
}

/**
 * Requests a selected context value through the DOM event channel.
 */
export function requestContextSelection<TContext extends UnknownContext>(
	host: ContextHostLike,
	context: TContext,
	request: DirectContextSelectionRequest<TContext>,
	options: {
		subscribe?: boolean;
		onSubscribe?: (unsubscribe: () => void) => void;
	},
): boolean;
export function requestContextSelection<TContext extends UnknownContext, Selected>(
	host: ContextHostLike,
	context: TContext,
	request: SelectedContextSelectionRequest<TContext, Selected>,
	options: {
		subscribe?: boolean;
		onSubscribe?: (unsubscribe: () => void) => void;
	},
): boolean;
export function requestContextSelection<TContext extends UnknownContext, Selected = ContextType<TContext>>(
	host: ContextHostLike,
	context: TContext,
	request: ContextSelectionRequest<TContext, Selected>,
	options: {
		subscribe?: boolean;
		onSubscribe?: (unsubscribe: () => void) => void;
	},
): boolean {
	const event = new ContextSubscriptionRequestEvent(
		context,
		request.callback as ContextCallback<Selected>,
		request.select,
		options.subscribe,
		options.onSubscribe,
	);

	host.dispatchEvent(event);
	return event.handled;
}
