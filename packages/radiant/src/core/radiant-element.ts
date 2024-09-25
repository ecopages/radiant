import type { UnknownContext } from '@/context/types';
import { type AttributeTypeConstant, getPrefixedPropertyKey } from '@/utils';

export type RenderInsertPosition = 'replace' | 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend';

/**
 * Represents a Radiant element event listener.
 */
export type RadiantElementEventListener = {
  selector: string;
  type: string;
  listener: EventListener;
  id: string;
  options?: AddEventListenerOptions;
};

/**
 * Represents an interface for a Radiant element.
 */
export interface IRadiantElement {
  /**
   * Called when a property of the element is updated.
   * @param changedProperty - The name of the changed property.
   * @param oldValue - The old value of the property.
   * @param newValue - The new value of the property.
   */
  updated(changedProperty: string, oldValue: unknown, newValue: unknown): void;

  /**
   * Subscribes to a Radiant element event.
   * @param event - The event listener to subscribe to.
   */
  subscribeEvent(event: RadiantElementEventListener): void;

  /**
   * Subscribes to multiple Radiant element events.
   * @param events - The array of event listeners to subscribe to.
   */
  subscribeEvents(events: RadiantElementEventListener[]): void;

  /**
   * Unsubscribes from a Radiant element event.
   * @param id - The ID of the event listener to unsubscribe from.
   */
  unsubscribeEvent(id: string): void;

  /**
   * Removes all subscribed events from the Radiant element.
   */
  removeAllSubscribedEvents(): void;

  /**
   * Renders a template into the specified target element.
   * @param options - The rendering options.
   * @param options.target - The target element to render the template into.
   * @param options.template - The template string to render.
   * @param options.insert - The position to insert the rendered template. (optional)
   */
  renderTemplate(options: {
    target: HTMLElement;
    template: string;
    insert?: RenderInsertPosition;
  }): void;

  /**
   * Called when the Radiant element is connected to a context.
   * @param context - The connected context.
   */
  connectedContextCallback(context: UnknownContext): void;
  /**
   * Radiant uses copies of the attributes to avoid conflicts with the native properties.
   * Those properties are prefixed with a double underscore.
   */
}

/**
 * A base class for creating custom elements with reactive properties and event subscriptions.
 * @extends HTMLElement
 * @implements IRadiantElement
 */
export class RadiantElement extends HTMLElement implements IRadiantElement {
  declare transformers: Map<string, (value: string | null) => unknown>;
  declare updatesRegistry: Map<string, Set<string>>;
  private eventSubscriptions = new Map<string, RadiantElementEventListener>();
  private elementReady = false;

  connectedCallback() {
    this.elementReady = true;
  }

  connectedContextCallback(_contextName: UnknownContext): void {}

  disconnectedCallback() {
    this.removeAllSubscribedEvents();
  }

  updated(changedProperty: string, oldValue: unknown, value: unknown) {
    if (!this.elementReady || !this.updatesRegistry || oldValue === value) return;
    const updates = this.updatesRegistry.get(changedProperty);
    if (updates) {
      for (const update of updates) {
        (this as any)[update]();
      }
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue || !this.elementReady) return;
    const prefixedPropertyKey = getPrefixedPropertyKey(name);

    if (prefixedPropertyKey in this) {
      const transformer = this.transformers.get(name);
      if (!transformer) return;
      const transformedValue = transformer(newValue);
      const transformedOldValue = transformer(oldValue);
      (this as any)[name] = transformedValue;
      this.updated(name, transformedOldValue, transformedValue);
    }
  }

  renderTemplate({
    target = this,
    template,
    insert = 'replace',
  }: {
    target: HTMLElement;
    template: string;
    insert?: RenderInsertPosition;
  }) {
    switch (insert) {
      case 'replace':
        target.innerHTML = template;
        break;
      case 'beforeend':
        target.insertAdjacentHTML('beforeend', template);
        break;
      case 'afterbegin':
        target.insertAdjacentHTML('afterbegin', template);
        break;
    }
  }

  public subscribeEvents(events: RadiantElementEventListener[]): void {
    for (const event of events) {
      this.subscribeEvent(event);
    }
  }

  public subscribeEvent(eventConfig: RadiantElementEventListener): void {
    const delegatedListener = (delegatedEvent: Event) => {
      if (delegatedEvent.target && (delegatedEvent.target as Element).matches(eventConfig.selector)) {
        eventConfig.listener.call(this, delegatedEvent);
      }
    };

    this.addEventListener(eventConfig.type, delegatedListener, eventConfig.options);
    this.eventSubscriptions.set(eventConfig.id, { ...eventConfig, listener: delegatedListener });
  }

  public unsubscribeEvent(id: string): void {
    const eventSubscription = this.eventSubscriptions.get(id);
    if (eventSubscription) {
      this.removeEventListener(eventSubscription.type, eventSubscription.listener, eventSubscription.options);
      this.eventSubscriptions.delete(id);
    }
  }

  public removeAllSubscribedEvents(): void {
    for (const eventSubscription of this.eventSubscriptions.values()) {
      this.removeEventListener(eventSubscription.type, eventSubscription.listener, eventSubscription.options);
    }
    this.eventSubscriptions.clear();
  }
}
