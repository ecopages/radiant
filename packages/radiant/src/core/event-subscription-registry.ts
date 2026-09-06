import { eventMatchesDelegatedSelector } from './delegated-event';

export type ElementEventListenerConfig = {
	selector: string;
	type: string;
	listener: EventListener;
	options?: AddEventListenerOptions;
};

type RadiantElementEventSubscription = ElementEventListenerConfig & {
	target: EventTarget;
};

export class EventSubscriptionRegistry {
	private readonly subscriptions = new Map<string, RadiantElementEventSubscription[]>();

	constructor(
		private readonly getInteractionTarget: () => EventTarget,
		private readonly getListenerContext: () => object,
	) {}

	/**
	 * Installs a delegated listener and returns a cleanup for that registration.
	 *
	 * @remarks
	 * Duplicate `type` + `selector` pairs are tracked independently. Cleanup
	 * closes over the installed listener so unsubscribing one registration cannot
	 * remove another that happens to share the same lookup key.
	 */
	public subscribe(eventConfig: ElementEventListenerConfig): () => void {
		const interactionTarget = this.getInteractionTarget();
		const listenerContext = this.getListenerContext();
		const delegatedListener = (delegatedEvent: Event) => {
			if (
				interactionTarget instanceof Node &&
				eventMatchesDelegatedSelector(delegatedEvent, interactionTarget, eventConfig.selector)
			) {
				eventConfig.listener.call(listenerContext, delegatedEvent);
			}
		};
		const subscriptionId = `${eventConfig.type}:${eventConfig.selector}`;
		const subscription: RadiantElementEventSubscription = {
			...eventConfig,
			listener: delegatedListener,
			target: interactionTarget,
		};
		interactionTarget.addEventListener(eventConfig.type, delegatedListener, eventConfig.options);
		const registrations = this.subscriptions.get(subscriptionId);
		if (registrations) {
			registrations.push(subscription);
		} else {
			this.subscriptions.set(subscriptionId, [subscription]);
		}

		return () => {
			this.unsubscribe(subscription);
		};
	}

	/**
	 * Returns whether any registration exists for `type:selector`.
	 */
	public hasEventSubscription(subscriptionId: string): boolean {
		const registrations = this.subscriptions.get(subscriptionId);
		return Boolean(registrations?.length);
	}

	public removeAll(): void {
		for (const registrations of this.subscriptions.values()) {
			for (const eventSubscription of registrations) {
				this.removeListener(eventSubscription);
			}
		}
		this.subscriptions.clear();
	}

	private unsubscribe(subscription: RadiantElementEventSubscription): void {
		const subscriptionId = `${subscription.type}:${subscription.selector}`;
		const registrations = this.subscriptions.get(subscriptionId);
		if (!registrations) {
			return;
		}

		const index = registrations.indexOf(subscription);
		if (index === -1) {
			return;
		}

		this.removeListener(subscription);
		registrations.splice(index, 1);

		if (registrations.length === 0) {
			this.subscriptions.delete(subscriptionId);
		}
	}

	private removeListener(eventSubscription: RadiantElementEventSubscription): void {
		eventSubscription.target.removeEventListener(
			eventSubscription.type,
			eventSubscription.listener,
			eventSubscription.options,
		);
	}
}
