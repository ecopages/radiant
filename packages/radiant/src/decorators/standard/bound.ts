import type { Method } from '../../types';

export function bound<T extends Method>(_: T, context: ClassMethodDecoratorContext) {
  const methodName = String(context.name);
  if (context.private) {
    throw new Error(`'bound' cannot decorate private properties like ${methodName as string}.`);
  }
  context.addInitializer(function (this: any) {
    this[methodName] = this[methodName].bind(this);
  });
}
