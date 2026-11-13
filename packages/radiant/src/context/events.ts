import type { Context, ContextCallback, ContextType, UnknownContext } from './types';

/**
 * List of events which can be emitted by a context provider or requester.
 */
export enum ContextEventsTypes {
	SUBSCRIPTION_REQUEST = 'context-subscription-request',
	CONTEXT_REQUEST = 'context-request',
	PROVIDER = 'context-provider',
}

/**
 * An event fired by a context requester to signal it desires a named context.
 *
 * A provider should inspect the `context` property of the event to determine if it has a value that can
 * satisfy the request, calling the `callback` with the requested value if so.
 *
 * If the requested context event contains a truthy `subscribe` value, then a provider can call the callback
 * multiple times if the value is changed, if this is the case the provider should pass an `unsubscribe`
 * function to the callback which requesters can invoke to indicate they no longer wish to receive these updates.
 *
 * @remarks
 * `handled` becomes `true` when a provider stops the event's propagation, which the protocol requires of a
 * provider that answers, so it also reports requests answered by other implementations.
 */
export class ContextRequestEvent<T extends UnknownContext> extends Event {
	public handled = false;

	public constructor(
		public readonly context: T,
		public readonly callback: ContextCallback<ContextType<T>>,
		public readonly subscribe?: boolean,
	) {
		super(ContextEventsTypes.CONTEXT_REQUEST, { bubbles: true, composed: true });
	}

	public markHandled(): void {
		this.handled = true;
	}

	public override stopPropagation(): void {
		this.markHandled();
		super.stopPropagation();
	}

	public override stopImmediatePropagation(): void {
		this.markHandled();
		super.stopImmediatePropagation();
	}
}

/**
 * A type which represents a subscription to a context value.
 */
type DirectContextSubscription<T extends UnknownContext> = {
	select?: undefined;
	callback: ContextCallback<ContextType<T>>;
};

type SelectedContextSubscription<T extends UnknownContext, Selected> = {
	select: (context: ContextType<T>) => Selected;
	callback: ContextCallback<Selected>;
};

export type ContextSubscription<T extends UnknownContext, Selected = ContextType<T>> =
	DirectContextSubscription<T> | SelectedContextSubscription<T, Selected>;

/**
 * An event fired by a context provider when it upgrades, so consumers that were already waiting can request the
 * context again.
 *
 * @remarks The community context protocol defines only `context-request`. This is the same `context-provider` event
 * that Lit's `@lit/context` dispatches and its `ContextRoot` listens for: an `Event` with the `context` and the
 * `contextTarget` that provides it. It bubbles and is composed; the provider element is the event target.
 * A provider announces itself once, when it is created. A provider that is disconnected and connected again does not
 * announce again: consumers re-request on their own connect.
 */
export class ContextProviderEvent extends Event {
	public constructor(
		public readonly context: UnknownContext,
		public readonly contextTarget: Element,
	) {
		super(ContextEventsTypes.PROVIDER, { bubbles: true, composed: true });
	}
}

/**
 * An event fired by a context requester to signal it desires a named context.
 *
 * A provider should inspect the `context` property of the event to determine if it has a value that can
 * satisfy the request, calling the `callback` with the requested value if so.
 *
 * If the requested context event contains a truthy `subscribe` value, then a provider can call the callback
 * multiple times if the value is changed, if this is the case the provider should pass an `unsubscribe`
 * function to the callback which requesters can invoke to indicate they no longer wish to receive these updates.
 *
 * It accepts a `selector` property which can be used to request a specific property of the context value.
 */
export class ContextSubscriptionRequestEvent<T extends UnknownContext, Selected = ContextType<T>> extends Event {
	public handled = false;

	public constructor(
		public readonly context: T,
		public readonly callback: ContextCallback<Selected>,
		public readonly select?: (context: ContextType<T>) => Selected,
		public readonly subscribe?: boolean,
		public readonly onSubscribe?: (unsubscribe: () => void) => void,
	) {
		super(ContextEventsTypes.SUBSCRIPTION_REQUEST, {
			bubbles: true,
			composed: true,
		});
	}

	public markHandled(): void {
		this.handled = true;
	}
}

declare global {
	interface HTMLElementEventMap {
		/**
		 * A 'context-subscription-request' event can be emitted by any element which desires
		 * a context value to be injected by an external provider.
		 */
		[ContextEventsTypes.SUBSCRIPTION_REQUEST]: ContextSubscriptionRequestEvent<UnknownContext>;
		/**
		 * A 'context-request' event can be emitted by any element which desires
		 * a context value to be injected by an external provider.
		 */
		[ContextEventsTypes.CONTEXT_REQUEST]: ContextRequestEvent<Context<unknown, unknown>>;
		/**
		 * A 'context-provider' event is emitted by a context provider when it connects or upgrades, so waiting
		 * consumers below it can request the context again.
		 */
		[ContextEventsTypes.PROVIDER]: ContextProviderEvent;
	}
}
