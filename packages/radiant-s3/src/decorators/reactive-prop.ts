import type { PropertyConfig, RadiantElement } from '../core/radiant-element.js';
import {
  type AttributeTypeConstant,
  defaultValueForType,
  isValueOfType,
  readAttributeValue,
  writeAttributeValue,
} from '../utils/attribute-utils.js';

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
export function reactiveProp<P = unknown>({ type, attribute, reflect, defaultValue }: ReactivePropertyOptions<P>) {
  if (defaultValue !== undefined && !isValueOfType(type, defaultValue)) {
    throw new Error(`defaultValue does not match the expected type for ${type.name}`);
  }

  return function <T extends RadiantElement, V>(_: undefined, context: ClassFieldDecoratorContext<T, V>) {
    const propertyName = String(context.name);
    const attributeKey = attribute ?? propertyName;
    const privatePropertyKey = Symbol(`__${String(context.name)}__value`);

    const propertyMapping: PropertyConfig = {
      type,
      name: propertyName,
      attribute: attributeKey,
      symbol: privatePropertyKey,
      converter: {
        fromAttribute: (value) => readAttributeValue(value, type),
        toAttribute: (value) => writeAttributeValue(value, type),
      },
    };

    context.addInitializer(function (this: T) {
      this.addPropertyConfigMap(propertyMapping);

      Object.defineProperty(this, propertyName, {
        get: function () {
          return this[privatePropertyKey];
        },
        set: function (newValue: T) {
          const oldValue = this[privatePropertyKey];
          if (oldValue === newValue) return;

          this[privatePropertyKey] = newValue;

          if (reflect) {
            const attributeValue = propertyMapping.converter.toAttribute(newValue);
            this.setAttribute(attributeKey, attributeValue);
          }

          this.notifyPropertyChanged(propertyName, oldValue, newValue);
        },
        enumerable: true,
        configurable: true,
      });

      const initialValue = getInitialValue(this, type, attributeKey, defaultValue);
      if (initialValue) {
        (this as any)[propertyName] = initialValue;
        this.notifyPropertyChanged(propertyName, null, initialValue);
      }
    });
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
    : (defaultValue ?? (defaultValueForType(type) as typeof defaultValue));
};
