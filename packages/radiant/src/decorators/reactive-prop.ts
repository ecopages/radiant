import type { PropertyConfig, RadiantElement } from '@/core/radiant-element';
import {
  type AttributeTypeConstant,
  defaultValueForType,
  isValueOfType,
  readAttributeValue,
  writeAttributeValue,
} from '@/utils/attribute-utils';

type ReactivePropertyOptions<T> = {
  type: AttributeTypeConstant;
  reflect?: boolean;
  attribute?: string;
  defaultValue?: T;
};

/**
 * A decorator to define a reactive property.
 * Every time the property changes, the `updated` method will be called.
 * @param options The options for the reactive property.
 * @param options.type The type of the property value.
 * @param options.reflect Whether to reflect the property to the attribute.
 * @param options.attribute The name of the attribute.
 * @param options.defaultValue The default value of the property.
 */
export function reactiveProp<T = unknown>({ type, attribute, reflect, defaultValue }: ReactivePropertyOptions<T>) {
  if (defaultValue !== undefined && !isValueOfType(type, defaultValue)) {
    throw new Error(`defaultValue does not match the expected type for ${type.name}`);
  }

  return (target: RadiantElement, propertyName: string) => {
    const originalValues = new WeakMap<WeakKey, unknown>();
    const attributeKey = attribute ?? propertyName;

    if (propertyName in target) {
      throw new Error(`Property "${propertyName}" already exists on ${target.constructor.name}`);
    }

    const propertyMapping: PropertyConfig = {
      type,
      propertyName,
      attributeKey,
      converter: {
        fromAttribute: (value) => readAttributeValue(value, type),
        toAttribute: (value) => writeAttributeValue(value, type),
      },
    };

    addPropertyToMappings(target, propertyMapping);

    Object.defineProperty(target, propertyName, {
      get: function () {
        if (!originalValues.has(this)) {
          const initialValue = getInitialValue(this, type, attributeKey, defaultValue as T);
          originalValues.set(this, initialValue);
        }
        return originalValues.get(this);
      },
      set: function (newValue: T) {
        const oldValue = originalValues.get(this);
        if (oldValue === newValue) return;
        originalValues.set(this, newValue);
        if (reflect) {
          const attributeValue = propertyMapping.converter.toAttribute(newValue);
          this.setAttribute(attributeKey, attributeValue);
        }
        this.updated(propertyName, oldValue, newValue);
      },
      enumerable: true,
      configurable: true,
    });

    const originalConnectedCallback = target.connectedCallback;

    target.connectedCallback = function (this: RadiantElement) {
      originalConnectedCallback.call(this);
      this.updated(propertyName, null, defaultValue);
    };

    addObservedAttribute(target, attributeKey);
  };
}

const getInitialValue = (
  target: RadiantElement,
  type: AttributeTypeConstant,
  attributeKey: string,
  defaultValue: unknown,
) => {
  if (type === Boolean) {
    const hasAttribute = target.hasAttribute(attributeKey);
    console.log('hasAttribute', hasAttribute);
    return hasAttribute || defaultValue;
  }

  const attributeValue = target.getAttribute(attributeKey);
  return attributeValue !== null
    ? readAttributeValue(attributeValue, type)
    : defaultValue || (defaultValueForType(type) as typeof defaultValue);
};

const addPropertyToMappings = (target: RadiantElement, propertyMapping: PropertyConfig) => {
  if (!('propertyConfigMap' in target)) {
    Object.defineProperty(target, 'propertyConfigMap', {
      value: new Map<string, PropertyConfig>(),
      configurable: true,
    });
  }

  target.propertyConfigMap.set(propertyMapping.propertyName, propertyMapping);
};

function addObservedAttribute(target: RadiantElement, attribute: string) {
  const ctor = target.constructor as typeof RadiantElement;
  const existingObservedAttributes = (ctor as any).observedAttributes || [];
  if (!existingObservedAttributes.includes(attribute)) {
    const newObservedAttributes = [...existingObservedAttributes, attribute];
    Object.defineProperty(ctor, 'observedAttributes', {
      get() {
        return newObservedAttributes;
      },
      configurable: true,
    });
  }
}
