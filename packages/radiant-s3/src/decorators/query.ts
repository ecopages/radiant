import { e } from '@kitajs/html';
import type { E } from 'vitest/dist/chunks/environment.CzISCQ7o';

type BaseQueryConfig = {
  all?: boolean;
  cache?: boolean;
};

type QueryConfig = BaseQueryConfig &
  (
    | {
        selector: string;
      }
    | {
        ref: string;
      }
  );

export function query(options: QueryConfig) {
  return function <T extends HTMLElement, V extends Element | Element[]>(
    _: undefined,
    context: ClassFieldDecoratorContext<T, V>,
  ) {
    const propertyName = String(context.name);
    const privatePropertyKey = Symbol(`__${String(propertyName)}__cache`);

    const selector = 'selector' in options ? options.selector : `[data-ref="${options.ref}"]`;

    const executeQuery = (instance: T) => {
      if (options?.all) {
        const result = instance.querySelectorAll(selector);
        return Array.from(result) as V;
      }
      return instance.querySelector(selector);
    };

    context.addInitializer(function (this: T) {
      Object.defineProperty(this, propertyName, {
        get() {
          if (options?.cache) {
            if (!this[privatePropertyKey]) {
              this[privatePropertyKey] = executeQuery(this);
            }
            return this[privatePropertyKey];
          }
          return executeQuery(this) as V;
        },
        enumerable: true,
        configurable: true,
      });

      (this as any)[privatePropertyKey] = executeQuery(this);
    });

    return function (this: T) {
      return executeQuery(this) as V;
    };
  };
}
