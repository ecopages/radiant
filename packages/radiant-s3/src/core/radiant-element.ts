import type { UnknownContext } from '../context/types';
import {
  type AttributeTypeConstant,
  type ReadAttributeValueReturnType,
  type WriteAttributeValueReturnType,
  defaultValueForType,
  getInitialValue,
  isValueOfType,
  readAttributeValue,
  writeAttributeValue,
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
export interface ReactiveProperty<T = unknown> {
  type: AttributeTypeConstant;
  value: T;
  initialValue: T;
  name: string;
  attribute: string;
  converter: {
    fromAttribute: (value: string) => ReadAttributeValueReturnType;
    toAttribute: (value: any) => WriteAttributeValueReturnType;
  };
}

/**
 * Represents the options for a reactive property.
 */
export type ReactivePropertyOptions<T> = {
  type: AttributeTypeConstant;
  reflect?: boolean;
  attribute?: string;
  defaultValue?: T;
};

export type ReactiveField<T = unknown> = {
  name: string;
  value: T;
  initialValue: T;
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
  notifyUpdate(changedProperty: string, oldValue: unknown, newValue: unknown): void;

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

  /**
   * Gets a reference to a child element by its data-ref attribute.
   * @param ref - The data-ref attribute value of the element to get.
   * @param all - Whether to get all elements with the specified data-ref attribute value.
   * @returns The element with the specified data-ref attribute value, an array of elements or null if no element was found.
   */
  getRef<T extends Element = Element>(ref: string, all: boolean): T | T[];
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
  private reactiveProperties = new Map<string, ReactiveProperty>();

  /**
   * A map of reactive fields, it contains the reactive fields configured via decorators.
   */
  private reactiveFields = new Map<string, ReactiveField>();

  /**
   * A map of property update callbacks. These callbacks are called when a property is updated.
   */
  private updateCallbacks = new Map<string, Set<(...rest: any[]) => any>>();

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

  public notifyUpdate(changedProperty: string, oldValue: unknown, value: unknown) {
    if (!this.updateCallbacks || oldValue === value) return;
    const updates = this.updateCallbacks.get(changedProperty);
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

    if (this.reactiveProperties.has(name)) {
      const config = this.reactiveProperties.get(name);

      const transformedValue = this.transformAttributeValue(newValue, config);
      const transformedOldValue = this.transformAttributeValue(oldValue, config);

      const key = config ? config.attribute : name;
      (this as any)[key] = transformedValue;
      this.notifyUpdate(name, transformedOldValue, transformedValue);
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

  public registerReactiveProperty(config: ReactiveProperty) {
    this.reactiveProperties.set(config.name, config);
  }

  public registerReactiveField<T>(config: ReactiveField<T>) {
    this.reactiveFields.set(config.name, config);
  }

  public registerUpdateCallback(property: string, update: (...rest: any[]) => any) {
    if (!this.updateCallbacks.has(property)) {
      this.updateCallbacks.set(property, new Set());
    }
    this.updateCallbacks.get(property)?.add(update);
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

  public getRef<T extends Element = Element>(ref: string, all: true): T[];
  public getRef<T extends Element = Element>(ref: string, all?: false): T;
  public getRef<T extends Element = Element>(ref: string, all = false): T | T[] {
    const selector = `[data-ref="${ref}"]`;
    let result: T | T[];
    if (all) {
      result = Array.from(this.querySelectorAll(selector)) as T[];
      if (result.length === 0) result = [];
    } else {
      result = this.querySelector(selector) as T;
      if (!result) {
        const fragment = document.createDocumentFragment();
        result = fragment as unknown as T;
      }
    }
    return result;
  }

  public createReactiveField<T>(propertyName: string, initialValue: T): void {
    const reactiveField: ReactiveField<T> = {
      name: propertyName,
      value: initialValue,
      initialValue: initialValue,
    };

    this.registerReactiveField(reactiveField);

    Object.defineProperty(this, propertyName, {
      get(this: RadiantElement) {
        return this.reactiveFields.get(propertyName)?.value ?? undefined;
      },
      set(this: RadiantElement, newValue: T) {
        const oldValue = this.reactiveFields.get(propertyName)?.value;
        if (oldValue !== newValue) {
          this.reactiveFields.set(propertyName, { ...reactiveField, value: newValue });
          this.notifyUpdate(propertyName, oldValue, newValue);
        }
      },
      enumerable: true,
      configurable: true,
    });

    this.notifyUpdate(propertyName, undefined, initialValue);
  }

  public createReactiveProp<T = unknown>(propertyName: string, options: ReactivePropertyOptions<T>): void {
    const { type, attribute, reflect, defaultValue } = options;
    const attributeKey = attribute ?? propertyName;

    if (defaultValue !== undefined && !isValueOfType(type, defaultValue)) {
      throw new Error(`defaultValue does not match the expected type for ${type.name}`);
    }

    const initialValue: T | undefined = getInitialValue(this, type, attributeKey, defaultValue) as T;

    const propertyMapping: ReactiveProperty<T> = {
      type,
      name: propertyName,
      value: initialValue,
      initialValue,
      attribute: attributeKey,
      converter: {
        fromAttribute: (value) => readAttributeValue(value, type),
        toAttribute: (value) => writeAttributeValue(value, type),
      },
    };

    this.registerReactiveProperty(propertyMapping);

    const handleReflectRequest = (value: T) => {
      if (reflect) {
        const attributeValue = propertyMapping.converter.toAttribute(value);
        this.setAttribute(attributeKey, attributeValue);
      }
    };

    Object.defineProperty(this, propertyName, {
      get: function (this: RadiantElement) {
        return this.reactiveProperties.get(propertyName)?.value ?? undefined;
      },
      set: function (this: RadiantElement, newValue: T) {
        const oldValue = this.reactiveProperties.get(propertyName)?.value;
        if (oldValue !== newValue) {
          this.reactiveProperties.set(propertyName, { ...propertyMapping, value: newValue });
          handleReflectRequest(newValue);
          this.notifyUpdate(propertyName, oldValue, newValue);
        }
      },
      enumerable: true,
      configurable: true,
    });

    if (initialValue !== undefined) {
      queueMicrotask(() => {
        this.notifyUpdate(propertyName, undefined, initialValue);
        handleReflectRequest(initialValue as T);
      });
    }
  }
}
