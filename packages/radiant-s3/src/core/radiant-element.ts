import type { UnknownContext } from '../context/types';
import type {
  AttributeTypeConstant,
  ReadAttributeValueReturnType,
  WriteAttributeValueReturnType,
} from '../utils/attribute-utils';

/**
 * Possible positions to insert a rendered template.
 */
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
 * Represents a property metadata object.
 */
export interface PropertyConfig {
  type: AttributeTypeConstant;
  name: string;
  symbol: symbol;
  attribute: string;
  converter: {
    fromAttribute: (value: string) => ReadAttributeValueReturnType;
    toAttribute: (value: any) => WriteAttributeValueReturnType;
  };
}

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
  notifyPropertyChanged(changedProperty: string, oldValue: unknown, newValue: unknown): void;

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
   * It adds a callback to be executed when the Radiant element is disconnected from the DOM.
   */
  registerCleanupCallback(callback: () => void): void;

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
}

/**
 * A base class for creating custom elements with reactive properties and event subscriptions.
 * @extends HTMLElement
 * @implements IRadiantElement
 */
export class RadiantElement extends HTMLElement implements IRadiantElement {
  /**
   * A map of property metadata objects, it contains useful information about the properties configured via decorators.
   */
  private propertyConfigMap = new Map<string, PropertyConfig>();

  /**
   * A map of property update callbacks. These callbacks are called when a property is updated.
   */
  private updatesRegistry = new Map<string, Set<(...rest: any[]) => any>>();

  /**
   * A map of event subscriptions used to manage event listeners on the Radiant element.
   */
  private eventSubscriptions = new Map<string, RadiantElementEventListener>();

  /**
   * An array of cleanup callbacks to be executed when the Radiant element is disconnected from the DOM.
   */
  private onDisconnectedCallback: (() => void)[] = [];

  /**
   * A flag indicating whether the element has been connected to the DOM.
   */
  private elementReady = false;

  connectedCallback() {
    this.elementReady = true;
  }

  connectedContextCallback(_contextName: UnknownContext): void {}

  disconnectedCallback() {
    this.removeAllSubscribedEvents();
    for (const cleanup of this.onDisconnectedCallback) {
      cleanup();
    }
  }

  public notifyPropertyChanged(changedProperty: string, oldValue: unknown, value: unknown) {
    if (!this.updatesRegistry || oldValue === value) return;
    const updates = this.updatesRegistry.get(changedProperty);
    if (updates) {
      for (const update of updates) {
        update();
      }
    }
  }

  private transformAttributeValue(value: string | null, config: any): unknown {
    return value ? config?.converter.fromAttribute(value) : value;
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue || !this.elementReady) return;
    if (this.propertyConfigMap.has(name)) {
      const config = this.propertyConfigMap.get(name);

      const transformedValue = this.transformAttributeValue(newValue, config);
      const transformedOldValue = this.transformAttributeValue(oldValue, config);

      const key = config ? config.symbol : name;
      (this as any)[key] = transformedValue;
      this.notifyPropertyChanged(name, transformedOldValue, transformedValue);
    }
  }

  public renderTemplate({
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

  public addPropertyConfigMap(config: PropertyConfig) {
    this.propertyConfigMap.set(config.name, config);
  }

  public addUpdateToRegistry(property: string, update: (...rest: any[]) => any) {
    if (!this.updatesRegistry.has(property)) {
      this.updatesRegistry.set(property, new Set());
    }
    this.updatesRegistry.get(property)?.add(update);
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

  public registerCleanupCallback(callback: () => void): void {
    this.onDisconnectedCallback.push(callback);
  }
}
