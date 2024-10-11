import type { RadiantElement, ReactivePropertyOptions } from '../core/radiant-element.js';

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
  return function <T extends RadiantElement, V>(_: undefined, context: ClassFieldDecoratorContext<T, V>) {
    const propertyName = String(context.name);
    const attributeKey = attribute ?? propertyName;

    context.addInitializer(function (this: T) {
      this.createReactiveProp(propertyName, { type, reflect, attribute: attributeKey, defaultValue });
    });
  };
}
