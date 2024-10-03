import type { RadiantElement } from '@/core';

export function reactiveField<T extends RadiantElement, V>(_: undefined, context: ClassFieldDecoratorContext<T, V>) {
  const privatePropertyKey = Symbol(`__${String(context.name)}__value`);

  const contextName = String(context.name);

  context.addInitializer(function (this: T) {
    Object.defineProperty(this, context.name, {
      get() {
        return this[privatePropertyKey];
      },
      set(newValue: unknown) {
        const oldValue = this[privatePropertyKey];
        if (oldValue !== newValue) {
          this[privatePropertyKey] = newValue;
          (this as RadiantElement).notifyPropertyChanged(contextName, oldValue, newValue);
        }
      },
      enumerable: true,
      configurable: true,
    });
  });

  return function (this: T, value: V) {
    (this as any)[privatePropertyKey] = value;
    return value;
  };
}
