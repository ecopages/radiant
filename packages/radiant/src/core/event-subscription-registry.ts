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
	private readonly subscriptions = new Map<string, RadiantElementEventSubscription>();

	constructor(
		private readonly getInteractionTarget: () => EventTarget,
		private readonly getListenerContext: () => object,
	) {}

	public subscribe(eventConfig: ElementEventListenerConfig): () => void {
		const interactionTarget = this.getInteractionTarget();
		const listenerContext = this.getListenerContext();
		const delegatedListener = (delegatedEvent: Event) => {
			if (delegatedEvent.target && (delegatedEvent.target as Element).matches(eventConfig.selector)) {
				eventConfig.listener.call(listenerContext, delegatedEvent);
			}
		};
		const subscriptionId = `${eventConfig.type}:${eventConfig.selector}`;
		interactionTarget.addEventListener(eventConfig.type, delegatedListener, eventConfig.options);
		this.subscriptions.set(subscriptionId, {
			...eventConfig,
			listener: delegatedListener,
			target: interactionTarget,
		});

		return () => {
			this.unsubscribe(subscriptionId);
		};
	}

	public hasEventSubscription(subscriptionId: string): boolean {
		return this.subscriptions.has(subscriptionId);
	}

	public removeAll(): void {
		for (const eventSubscription of this.subscriptions.values()) {
			eventSubscription.target.removeEventListener(
				eventSubscription.type,
				eventSubscription.listener,
				eventSubscription.options,
			);
		}
		this.subscriptions.clear();
	}

	private unsubscribe(id: string): void {
		const eventSubscription = this.subscriptions.get(id);
		if (eventSubscription) {
			eventSubscription.target.removeEventListener(
				eventSubscription.type,
				eventSubscription.listener,
				eventSubscription.options,
			);
			this.subscriptions.delete(id);
		}
	}
}
