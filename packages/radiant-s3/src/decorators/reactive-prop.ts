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

const instancePropertyValues = new WeakMap<RadiantElement, Map<string, unknown>>();

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
    let initialValue: P | undefined;

    const propertyMapping: PropertyConfig = {
      type,
      name: propertyName,
      attribute: attributeKey,
      converter: {
        fromAttribute: (value) => readAttributeValue(value, type),
        toAttribute: (value) => writeAttributeValue(value, type),
      },
    };

    context.addInitializer(function (this: T) {
      this.addPropertyConfigMap(propertyMapping);

      if (!instancePropertyValues.has(this)) {
        instancePropertyValues.set(this, new Map());
      }

      const propertyValues = instancePropertyValues.get(this) as Map<string, unknown>;

      initialValue = getInitialValue(this, type, attributeKey, defaultValue) as P;

      propertyValues.set(propertyName, initialValue);

      const handleReflectRequest = (value: P) => {
        if (reflect) {
          const attributeValue = propertyMapping.converter.toAttribute(value);
          this.setAttribute(attributeKey, attributeValue);
        }
      };

      Object.defineProperty(this, propertyName, {
        get: function () {
          return propertyValues.get(propertyName);
        },
        set: function (this: T, newValue: P) {
          const oldValue = propertyValues.get(propertyName);
          if (oldValue !== newValue) {
            propertyValues.set(propertyName, newValue);
            handleReflectRequest(newValue);
            this.notifyPropertyChanged(propertyName, oldValue, newValue);
          }
        },
        enumerable: true,
        configurable: true,
      });

      if (initialValue !== undefined) {
        queueMicrotask(() => {
          this.notifyPropertyChanged(propertyName, undefined, initialValue);
          handleReflectRequest(initialValue as P);
        });
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
    : defaultValue || (defaultValueForType(type) as typeof defaultValue);
};
