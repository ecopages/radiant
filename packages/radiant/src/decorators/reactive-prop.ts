import type { RadiantElement } from '@/core/radiant-element';
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

  return (proto: RadiantElement, propertyKey: string) => {
    const originalValues = new WeakMap<WeakKey, unknown>();
    const prefixedPropertyKey = `__${propertyKey}`;
    const attributeKey = attribute ?? propertyKey;

    const getInitialValue = (context: RadiantElement) => {
      if (type === Boolean) {
        const hasAttribute = context.hasAttribute(attributeKey);
        return hasAttribute || defaultValue;
      }

      const attributeValue = context.getAttribute(attributeKey);
      return attributeValue !== null
        ? readAttributeValue(attributeValue, type)
        : defaultValue || defaultValueForType(type);
    };

    Object.defineProperty(proto, prefixedPropertyKey, {
      get: function () {
        if (!originalValues.has(this)) {
          const initialValue = getInitialValue(this);
          originalValues.set(this, initialValue);
        }
        return originalValues.get(this);
      },
      set: function (newValue: T) {
        const oldValue = originalValues.get(this);
        if (oldValue === newValue) return;
        originalValues.set(this, newValue);
        if (reflect) this.setAttribute(attributeKey, writeAttributeValue(newValue, type));
        this.updated(propertyKey, oldValue, newValue);
      },
      enumerable: true,
      configurable: true,
    });

    Object.defineProperty(proto, propertyKey, {
      get: function () {
        return this[prefixedPropertyKey];
      },
      set: function (newValue: string) {
        this[prefixedPropertyKey] = newValue;
      },
      enumerable: true,
      configurable: true,
    });
  };
}
