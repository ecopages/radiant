import { createMarkupNodeLike, type JsxRenderable } from '@ecopages/jsx';
import type { SsrSerializableHydrationBinding } from '../core/ssr-hydration-binding';
import type { AttributeTypeConstant } from '../utils/attribute-utils';
import {
	ContextEventsTypes,
	ContextOnMountEvent,
	type ContextRequestEvent,
	type ContextSubscription,
	type ContextSubscriptionRequestEvent,
} from './events';
import { findHydrationScript, parseHydrationPayload } from '../core/hydration-codec';
import { createContextHydrationScriptTag, escapeContextHydrationJson } from './hydration-script';
import type { Context, ContextType, UnknownContext } from './types';
import { resolveContextHydrationHost, type ContextHostLike } from './context-host';

type ContextProviderOptions<T extends UnknownContext> = {
	context: UnknownContext;
	hydrationKey?: string;
	initialValue?: T['__context__'];
	hydrate?: AttributeTypeConstant;
	serialize?: (value: ContextType<T>) => unknown;
};

type ActiveContextSubscription<T extends UnknownContext> = {
	hasChanged(newContext: ContextType<T>, prevContext: ContextType<T> | undefined): boolean;
	notify(context: ContextType<T>): void;
	unsubscribe: () => void;
};

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
	 * Sets the context with the provided update and invokes the optional callback function.
	 *
	 * @param update - The partial update to be applied to the context.
	 * @param callback - An optional callback function that receives the updated context.
	 */
	setContext: (update: Partial<ContextType<T>>, callback?: (context: ContextType<T>) => void) => void;

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
		this.value = options.initialValue as ContextType<T>;
		this.tryHydrateFromHost();

		this.registerEvents();
		this.host.dispatchEvent(new ContextOnMountEvent(this.context));
	}

	setContext = (update: Partial<ContextType<T>>, callback?: (context: ContextType<T>) => void) => {
		this.tryHydrateFromHost();
		this.pendingHostHydration = false;

		if (typeof this.value === 'undefined' && this.isObject(update)) {
			const oldContext = this.value;
			this.value = { ...update } as ContextType<T>;
			if (callback) callback(this.value);
			this.notifySubscribers(this.value, oldContext);
			return;
		}

		if (this.isObject(this.value) && this.isObject(update)) {
			const oldContext = { ...this.value };
			this.value = { ...this.value, ...update };
			if (callback) callback(this.value);
			this.notifySubscribers(this.value, oldContext);
		}
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
	 * The serialized payload is JSON-escaped so it can be embedded safely inside a
	 * `<script type="application/json">` tag.
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

		return escapeContextHydrationJson(serializedValue);
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

		return createContextHydrationScriptTag({
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
				const index = this.subscriptions.indexOf(subscription);

				if (index !== -1) {
					this.subscriptions.splice(index, 1);
				}
			},
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
			return {
				...(this.value ?? {}),
				...parsedHydrationValue,
			} as ContextType<T>;
		}

		return parsedHydrationValue;
	}

	private isObject(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && !Array.isArray(value) && value !== null;
	}

	private findHydrationScriptElement(): Element | null {
		return findHydrationScript(resolveContextHydrationHost(this.host), 'context', this.hydrationKey);
	}

	private notifySubscribers = (newContext: ContextType<T>, prevContext: ContextType<T> | undefined) => {
		for (const sub of this.subscriptions) {
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

	private registerEvents = () => {
		this.host.addEventListener(
			ContextEventsTypes.SUBSCRIPTION_REQUEST,
			this.onSubscriptionRequest as EventListener,
		);
		this.host.addEventListener(ContextEventsTypes.CONTEXT_REQUEST, this.onContextRequest as EventListener);
	};
}
