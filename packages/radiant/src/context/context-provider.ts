import { createMarkupNodeLike, type JsxRenderable } from '@ecopages/jsx';
import type { SsrSerializableHydrationBinding } from '../core/ssr-hydration-binding';
import type { AttributeTypeConstant } from '../utils/attribute-utils';
import {
	ContextEventsTypes,
	ContextOnMountEvent,
	ContextProviderEvent,
	type ContextRequestEvent,
	type ContextSubscription,
	type ContextSubscriptionRequestEvent,
} from './events';
import { createHydrationScriptTag, findHydrationScript, parseHydrationPayload } from '../core/hydration-codec';
import type { Context, ContextType, UnknownContext } from './types';
import { resolveContextHostElement, resolveContextHydrationHost, type ContextHostLike } from './context-host';

type ContextProviderOptions<T extends UnknownContext> = {
	context: UnknownContext;
	hydrationKey?: string;
	/**
	 * The value the provider starts with.
	 *
	 * @remarks
	 * Each provider takes its own shallow copy of a plain object or an array, so
	 * hosts that share one options object do not see each other's writes to the
	 * top level. Nested objects and class instances are shared, not cloned.
	 */
	initialValue?: T['__context__'];
	hydrate?: AttributeTypeConstant;
	serialize?: (value: ContextType<T>) => unknown;
};

type ActiveContextSubscription<T extends UnknownContext> = {
	hasChanged(newContext: ContextType<T>, prevContext: ContextType<T> | undefined): boolean;
	notify(context: ContextType<T>): void;
	unsubscribe: () => void;
	active: boolean;
};

/**
 * Merges `update` over `base` one level deep into a new object.
 *
 * @remarks A key present in `update` replaces the same key in `base` outright, so a nested object is
 * overwritten, not merged. Used for `setContext` and for merging a hydration payload over the initial value.
 */
function mergeShallow(
	base: Record<string, unknown> | undefined,
	update: Record<string, unknown>,
): Record<string, unknown> {
	return { ...base, ...update };
}

/**
 * The argument accepted by `setContext`: a partial for an object value, the full value otherwise.
 *
 * @remarks `Partial` alone would make array elements optional, so arrays and primitives are passed through.
 */
export type ContextUpdate<V> = V extends readonly unknown[] ? V : V extends object ? Partial<V> : V;

export interface SsrSerializableContextProvider extends SsrSerializableHydrationBinding {
	/** Returns the current context payload that should be visible to descendants. */
	getContext(): unknown;
	/** Returns the context token used to match nested SSR consumers and providers. */
	getContextKey(): UnknownContext;
}

/**
 * Represents a context provider that allows setting and getting the context,
 * as well as subscribing to context updates.
 *
 * @template T - The type of the context.
 */
export interface IContextProvider<T extends Context<unknown, unknown>> {
	/**
	 * Updates the context and invokes the optional callback function.
	 *
	 * @remarks A plain object update over a plain object value is merged one level deep. Any other update
	 * (array, primitive, `null`, or an object/non-object mismatch) replaces the value.
	 *
	 * @param update - A partial update for an object context, or the new value for any other context.
	 * @param callback - An optional callback function that receives the updated context.
	 */
	setContext: (update: ContextUpdate<ContextType<T>>, callback?: (context: ContextType<T>) => void) => void;

	/**
	 * Gets the current context.
	 *
	 * @returns The current context.
	 */
	getContext: () => ContextType<T>;

	/**
	 * Subscribes to context updates.
	 *
	 * @param subscription - The subscription object that defines the callback function to be invoked on context updates.
	 * @returns A function that removes this subscription.
	 *
	 * @remarks
	 * Notification snapshots the current subscriber list. Unsubscribing during
	 * delivery cannot skip later subscribers. Subscribers added during delivery
	 * wait for a later update. Removing another subscriber before its turn skips
	 * that subscriber for the current update.
	 */
	subscribe: <Selected = ContextType<T>>(subscription: ContextSubscription<T, Selected>) => () => void;
}

/**
 * It creates a context provider that allows setting and getting the context,
 * It will also be in charge of notifying the subscribers when the context changes.
 *
 * @template T - The type of the context.
 * @implements IContextProvider
 *
 * @example
 * ```ts
 * export class MyElement extends RadiantElement {
 *  provider = new ContextProvider<typeof myContext>(this, {
 *    context: myContext,
 *    initialValue: {
 *      value: 'Hello World',
 *    },
 * });
 * ```
 */
export class ContextProvider<T extends Context<unknown, unknown>>
	implements IContextProvider<T>, SsrSerializableContextProvider
{
	private host: ContextHostLike;
	private context: UnknownContext;
	private hydrationKey?: string;
	private hydrate?: AttributeTypeConstant;
	private serialize?: (value: ContextType<T>) => unknown;
	private pendingHostHydration: boolean;
	private value: ContextType<T> | undefined;

	subscriptions: ActiveContextSubscription<T>[] = [];

	/**
	 * Creates a new instance of the ContextProvider.
	 *
	 * @param host - The host element that will contain the context provider.
	 * @param options - The options to configure the context provider.
	 */
	constructor(host: ContextHostLike, options: ContextProviderOptions<T>) {
		this.host = host;
		this.context = options.context;
		this.hydrationKey = options.hydrationKey;
		this.hydrate = options.hydrate;
		this.serialize = options.serialize;
		this.pendingHostHydration = Boolean(options.hydrate);
		this.value = this.copyInitialValue(options.initialValue) as ContextType<T>;
		this.tryHydrateFromHost();

		this.registerEvents();
		this.host.dispatchEvent(new ContextOnMountEvent(this.context));
		this.announceToWaitingConsumers();
	}

	/**
	 * @remarks A plain object update over a plain object (or `undefined`) value is merged one level deep.
	 * In every other case (array, primitive, `null`, or an object/non-object mismatch) `update` replaces the value.
	 */
	setContext = (update: ContextUpdate<ContextType<T>>, callback?: (context: ContextType<T>) => void) => {
		this.tryHydrateFromHost();
		this.pendingHostHydration = false;

		const oldContext = this.isObject(this.value) ? { ...this.value } : this.value;

		if (this.isObject(update) && (this.isObject(this.value) || typeof this.value === 'undefined')) {
			this.value = mergeShallow(this.value, update) as ContextType<T>;
		} else {
			this.value = update as ContextType<T>;
		}

		if (callback) callback(this.value);
		this.notifySubscribers(this.value, oldContext);
	};

	getContext = () => {
		this.tryHydrateFromHost();
		return this.value as ContextType<T>;
	};

	/**
	 * Returns the provider's logical context token.
	 *
	 * SSR helpers use this token to resolve the closest matching provider while a
	 * host subtree is being serialized.
	 */
	getContextKey = () => {
		return this.context;
	};

	/**
	 * Serializes the current provider value for inclusion in a hydration script.
	 *
	 * Returns raw `JSON.stringify` output. Escaping for safe embedding inside a
	 * `<script type="application/json">` tag happens in `createHydrationScriptTag`.
	 */
	serializeHydrationValue = (): string | undefined => {
		this.tryHydrateFromHost();

		if (!this.hydrate || typeof this.value === 'undefined') {
			return undefined;
		}

		const hydrationValue = this.serialize ? this.serialize(this.value) : this.value;

		if (typeof hydrationValue === 'undefined') {
			return undefined;
		}

		const serializedValue = JSON.stringify(hydrationValue);

		if (typeof serializedValue !== 'string') {
			return undefined;
		}

		return serializedValue;
	};

	/**
	 * Builds the raw HTML hydration script for this provider.
	 *
	 * When `hydrationKey` is present, the marker is scoped so sibling or nested
	 * providers can recover their own payloads without accidentally reading a
	 * descendant script.
	 */
	renderHydrationScriptTag = (): string | undefined => {
		const serializedValue = this.serializeHydrationValue();

		if (!serializedValue) {
			return undefined;
		}

		return createHydrationScriptTag({
			type: 'context',
			hydrationKey: this.hydrationKey,
			serializedValue,
		});
	};

	/**
	 * Wraps the provider hydration script in a minimal JSX node-like value.
	 *
	 * This lets JSX-based host renderers append the script without needing a real
	 * DOM element instance during SSR.
	 */
	renderHydrationScript = (): JsxRenderable | undefined => {
		const outerHTML = this.renderHydrationScriptTag();

		if (!outerHTML) {
			return undefined;
		}

		return createMarkupNodeLike(outerHTML);
	};

	subscribe = <Selected = ContextType<T>>(subscriptionSpec: ContextSubscription<T, Selected>) => {
		const subscription: ActiveContextSubscription<T> = {
			hasChanged: (newContext, prevContext) => {
				if (typeof prevContext === 'undefined' || !subscriptionSpec.select) {
					return true;
				}

				return subscriptionSpec.select(newContext) !== subscriptionSpec.select(prevContext);
			},
			notify: (context) => {
				if (subscriptionSpec.select) {
					subscriptionSpec.callback(subscriptionSpec.select(context), subscription.unsubscribe);
					return;
				}

				subscriptionSpec.callback(context, subscription.unsubscribe);
			},
			unsubscribe: () => {
				if (!subscription.active) {
					return;
				}

				subscription.active = false;
				const index = this.subscriptions.indexOf(subscription);

				if (index !== -1) {
					this.subscriptions.splice(index, 1);
				}
			},
			active: true,
		};
		this.subscriptions.push(subscription);

		return subscription.unsubscribe;
	};

	private tryHydrateFromHost(): void {
		if (!this.pendingHostHydration) {
			return;
		}

		const hydrationScriptElement = this.findHydrationScriptElement();

		if (!hydrationScriptElement) {
			return;
		}

		this.value = this.mergeHydrationValue(
			parseHydrationPayload(hydrationScriptElement, this.value) as ContextType<T>,
		);
		this.pendingHostHydration = false;
	}

	private mergeHydrationValue(parsedHydrationValue: ContextType<T>): ContextType<T> {
		if (
			this.hydrate === Object &&
			this.isObject(parsedHydrationValue) &&
			(this.isObject(this.value) || typeof this.value === 'undefined')
		) {
			return mergeShallow(this.value, parsedHydrationValue) as ContextType<T>;
		}

		return parsedHydrationValue;
	}

	private copyInitialValue(value: unknown): unknown {
		if (Array.isArray(value)) return [...value];
		if (this.isObject(value)) {
			const prototype = Object.getPrototypeOf(value);
			if (prototype === Object.prototype || prototype === null) return { ...value };
		}
		return value;
	}

	private isObject(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && !Array.isArray(value) && value !== null;
	}

	private findHydrationScriptElement(): Element | null {
		return findHydrationScript(resolveContextHydrationHost(this.host), 'context', this.hydrationKey);
	}

	/**
	 * Delivers a context update to the subscribers present at the start of this
	 * notification.
	 *
	 * @remarks
	 * Delivery uses a snapshot of `subscriptions`. Subscribers added during a
	 * callback are not notified until a later update. A subscriber removed before
	 * its turn is skipped via that subscription's `active` flag. Self-unsubscription
	 * therefore cannot prevent later subscribers from receiving the same update.
	 */
	private notifySubscribers = (newContext: ContextType<T>, prevContext: ContextType<T> | undefined) => {
		const snapshot = this.subscriptions.slice();

		for (const sub of snapshot) {
			if (!sub.active) {
				continue;
			}

			if (sub.hasChanged(newContext, prevContext)) {
				sub.notify(newContext);
			}
		}
	};

	private handleSubscriptionRequest = (
		subscription: ContextSubscription<T, unknown>,
		{
			subscribe,
			onSubscribe,
		}: {
			subscribe?: boolean;
			onSubscribe?: (unsubscribe: () => void) => void;
		},
	) => {
		this.tryHydrateFromHost();
		const unsubscribe = subscribe ? this.subscribe(subscription) : undefined;

		if (unsubscribe) {
			onSubscribe?.(unsubscribe);
		}

		if (typeof this.value === 'undefined') return;

		if (subscription.select) {
			subscription.callback(subscription.select(this.value), unsubscribe);
		} else {
			subscription.callback(this.value, unsubscribe);
		}
	};

	private onSubscriptionRequest = (event: ContextSubscriptionRequestEvent<UnknownContext>) => {
		const { context, callback, subscribe, select, target, onSubscribe } = event;
		if (context !== this.context) return;

		event.markHandled();
		event.stopPropagation();

		if (target instanceof EventTarget) {
			target.dispatchEvent(new ContextOnMountEvent(this.context));
		}

		if (select) {
			this.handleSubscriptionRequest({ select, callback }, { subscribe, onSubscribe });
			return;
		}

		this.handleSubscriptionRequest({ callback }, { subscribe, onSubscribe });
	};

	private onContextRequest = (event: ContextRequestEvent<UnknownContext>) => {
		const { context, callback } = event;
		if (context !== this.context) return;
		event.markHandled();
		event.stopPropagation();
		callback(this);
	};

	/**
	 * Announces this provider so consumers below it that found no provider can request again.
	 *
	 * @remarks
	 * Deferred to a microtask: the provider is created while its host is still constructing, and a consumer
	 * answered at that point could read host fields that are not initialized yet. Only a connected browser host
	 * announces; the server has no waiting consumers.
	 */
	private announceToWaitingConsumers = () => {
		const element = resolveContextHostElement(this.host);

		if (!element || typeof element.isConnected !== 'boolean') return;

		queueMicrotask(() => {
			if (element.isConnected) {
				element.dispatchEvent(new ContextProviderEvent(this.context));
			}
		});
	};

	private registerEvents = () => {
		this.host.addEventListener(
			ContextEventsTypes.SUBSCRIPTION_REQUEST,
			this.onSubscriptionRequest as EventListener,
		);
		this.host.addEventListener(ContextEventsTypes.CONTEXT_REQUEST, this.onContextRequest as EventListener);
	};
}
