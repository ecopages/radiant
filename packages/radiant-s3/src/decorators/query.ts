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
  return function <T extends HTMLElement, V extends Element | null | NodeListOf<Element>>(
    _: undefined,
    context: ClassFieldDecoratorContext<T, V>,
  ) {
    const privatePropertyKey = Symbol(`__${String(context.name)}__cache`);

    const selector = 'selector' in options ? options.selector : `[data-ref="${options.ref}"]`;

    const executeQuery = (instance: T) => {
      if (options?.all) {
        return instance.querySelectorAll(selector) as V;
      }
      return instance.querySelector(selector) as V;
    };

    context.addInitializer(function (this: T) {
      Object.defineProperty(this, context.name, {
        get() {
          if (options?.cache) {
            if (!this[privatePropertyKey]) {
              this[privatePropertyKey] = executeQuery(this) as V;
            }
            return this[privatePropertyKey];
          }
          return executeQuery(this) as V;
        },
        enumerable: true,
        configurable: true,
      });
    });
  };
}
