import type { Method } from '../types';

export function bound(...args: unknown[]): Method {
  return function <T extends Method>(originalMethod: T, context: ClassMethodDecoratorContext<T, T>) {
    const contextName = String(context.name);
    const boundName = `${contextName}__bound`;

    context.addInitializer(function (this: T) {
      Object.defineProperty(this, contextName, {
        configurable: true,
        value: Object.defineProperty(originalMethod.bind(this, ...args), 'name', { value: boundName }),
        writable: true,
      });
    });
  };
}
