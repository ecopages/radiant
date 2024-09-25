import type { RadiantElement } from '@/core/radiant-element';
import {
  type AttributeTypeConstant,
  defaultValueForType,
  getPrefixedPropertyKey,
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

    const prefixedPropertyKey = getPrefixedPropertyKey(propertyName);
    const attributeKey = attribute ?? propertyName;

    addTransformer(target, attributeKey, type);

    Object.defineProperty(target, prefixedPropertyKey, {
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
        if (reflect) this.setAttribute(attributeKey, writeAttributeValue(newValue, type));
        this.updated(propertyName, oldValue, newValue);
      },
      enumerable: true,
      configurable: true,
    });

    Object.defineProperty(target, propertyName, {
      get: function () {
        return this[prefixedPropertyKey];
      },
      set: function (newValue: T) {
        this[prefixedPropertyKey] = newValue;
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
    return hasAttribute || defaultValue;
  }

  const attributeValue = target.getAttribute(attributeKey);
  return attributeValue !== null
    ? readAttributeValue(attributeValue, type)
    : defaultValue || (defaultValueForType(type) as typeof defaultValue);
};

const addTransformer = (target: RadiantElement, attributeKey: string, type: AttributeTypeConstant) => {
  if (!('transformers' in target)) {
    Object.defineProperty(target, 'transformers', {
      value: new Map<string, (value: string | null) => unknown>(),
      configurable: true,
    });
  }

  target.transformers.set(attributeKey, (value) => {
    if (value === null) return value;
    const transformedValue = readAttributeValue(value, type);
    return transformedValue;
  });
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
