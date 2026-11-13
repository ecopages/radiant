import type { ContextHostLike } from './context-host';
import { clearPendingContextRequest, registerPendingContextRequest } from './context-late-provider';
import { ContextProviderRequestEvent } from './context-provider-request';
import { resolveAmbientSsrContextProvider } from './context-ssr-bridge';
import { ContextRequestEvent, ContextSubscriptionRequestEvent } from './events';
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
 * The SSR provider each consumer assignment was last announced with.
 *
 * @remarks A server host resolves its consumed context before `initialize` and again in `prepareForSsr`, and a
 * server-rendered controller again when it connects. Keying by the assignment keeps each field's
 * `connectedContextCallback` to one per provider.
 */
const announcedSsrProviders = new WeakMap<ConsumedContextAssignment, unknown>();

/**
 * The SSR provider and context value each selection callback was last delivered from.
 *
 * @remarks The same repeated resolution as {@link announcedSsrProviders}. A selector is pure over the context
 * value, so an unchanged provider and value skip the callback even when `select` returns a fresh object.
 */
const deliveredSsrSelections = new WeakMap<object, { provider: unknown; value: unknown }>();

/**
 * Resolves a consumed context from the active SSR provider stack when one is available.
 *
 * This keeps SSR-specific lookup outside decorator implementations while preserving
 * the same consumer initialization contract for both standard and legacy decorators.
 *
 * @remarks The field is assigned on every call; the host is notified only the first time `assign` sees a provider.
 *
 * @returns `true` when the context was resolved synchronously from SSR state.
 */
export function initializeConsumedContext(
	host: ContextHostLike,
	context: UnknownContext,
	assign: ConsumedContextAssignment,
): boolean {
	const provider = resolveAmbientSsrContextProvider(context);

	if (!provider) {
		return false;
	}

	assign(provider);

	if (announcedSsrProviders.get(assign) === provider) {
		return true;
	}

	announcedSsrProviders.set(assign, provider);
	host.connectedContextCallback(context);

	return true;
}

/**
 * Requests a context provider through the DOM event channel when SSR state is not active.
 *
 * @remarks
 * Uses Radiant's internal provider request, not `context-request`: `@consumeContext` injects the provider
 * instance, which a protocol provider never hands out, so only Radiant providers can answer it.
 */
export function requestConsumedContext(
	host: ContextHostLike,
	context: UnknownContext,
	assign: ConsumedContextAssignment,
): boolean {
	const callback = (provider: unknown) => {
		assign(provider);
		host.connectedContextCallback(context);
	};
	const dispatch = () => {
		const event = new ContextProviderRequestEvent(context, callback);
		host.dispatchEvent(event);
		return event.handled;
	};

	if (dispatch()) {
		clearPendingContextRequest(host, assign);
		return true;
	}

	registerPendingContextRequest(host, context, assign, dispatch);
	return false;
}

/**
 * Resolves a selected context value from the active SSR provider stack when available.
 *
 * @remarks Skips the callback when it was already delivered from the same provider and context value.
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
	const delivered = deliveredSsrSelections.get(request.callback);

	if (delivered?.provider === provider && Object.is(delivered.value, resolvedContext)) {
		return true;
	}

	deliveredSsrSelections.set(request.callback, { provider, value: resolvedContext });

	if (request.select) {
		request.callback(request.select(resolvedContext));
		return true;
	}

	request.callback(resolvedContext);
	return true;
}

/**
 * Requests a selected context value through the DOM event channel.
 *
 * @remarks
 * A Radiant provider answers the `context-subscription-request` first. When none does, the same request goes out
 * as a community protocol `context-request`, so a provider from another implementation can answer it. In a tree
 * that mixes implementations, a Radiant provider further up therefore wins over a nearer foreign provider of the
 * same context.
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
	const protocolCallback = createProtocolSelectionCallback(request, options);
	const dispatch = () => {
		const event = new ContextSubscriptionRequestEvent(
			context,
			request.callback as ContextCallback<Selected>,
			request.select,
			options.subscribe,
			options.onSubscribe,
		);

		host.dispatchEvent(event);

		if (event.handled) {
			return true;
		}

		const protocolEvent = new ContextRequestEvent(context, protocolCallback, options.subscribe);
		host.dispatchEvent(protocolEvent);
		return protocolEvent.handled;
	};

	if (dispatch()) {
		clearPendingContextRequest(host, request.callback);
		return true;
	}

	registerPendingContextRequest(host, context, request.callback, dispatch);
	return false;
}

/**
 * Adapts a selection request to a community protocol `context-request` callback.
 *
 * @remarks
 * Mirrors what a Radiant provider does for a `context-subscription-request`: an `undefined` value before the first
 * delivery is skipped (a protocol provider may answer before it has a value), a request that did not subscribe
 * takes one value, `select` is applied to each value, and a subscriber's `unsubscribe` reaches `onSubscribe`.
 * An `unsubscribe` handed to a request that did not subscribe is called at once, as the protocol advises a
 * defensive consumer to do.
 */
function createProtocolSelectionCallback<TContext extends UnknownContext, Selected>(
	request: ContextSelectionRequest<TContext, Selected>,
	options: {
		subscribe?: boolean;
		onSubscribe?: (unsubscribe: () => void) => void;
	},
): ContextCallback<ContextType<TContext>> {
	let delivered = false;
	let announcedUnsubscribe: (() => void) | undefined;

	return (value, unsubscribe) => {
		if (unsubscribe && !options.subscribe) {
			unsubscribe();
		} else if (unsubscribe && unsubscribe !== announcedUnsubscribe) {
			announcedUnsubscribe = unsubscribe;
			options.onSubscribe?.(unsubscribe);
		}

		if (delivered ? !options.subscribe : typeof value === 'undefined') {
			return;
		}

		delivered = true;

		if (request.select) {
			request.callback(request.select(value));
			return;
		}

		request.callback(value);
	};
}
