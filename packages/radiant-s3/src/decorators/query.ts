type BaseQueryConfig = {
  all?: boolean;
  cache?: boolean;
};

type QueryBySelector = { selector: string };

type QueryByRef = { ref: string };

type QueryConfig = BaseQueryConfig & (QueryBySelector | QueryByRef);

export function query(options: QueryConfig) {
  return function <T extends HTMLElement, V extends Element | Element[]>(
    _: undefined,
    context: ClassFieldDecoratorContext<T, V>,
  ) {
    const propertyName = String(context.name);
    const privatePropertyKey = Symbol(`__${String(propertyName)}__cache`);

    const selector = 'selector' in options ? options.selector : `[data-ref="${options.ref}"]`;

    const executeQuery = (instance: T) => {
      let result: V | V[] = [];
      if (options?.all) {
        const queried = instance.querySelectorAll(selector);
        result = queried.length ? (Array.from(queried) as V) : [];
        return result;
      }

      return instance.querySelector(selector);
    };

    context.addInitializer(function (this: T) {
      Object.defineProperty(this, propertyName, {
        get() {
          if (options?.cache) {
            if (!this[privatePropertyKey] || (options?.all && !this[privatePropertyKey].length)) {
              this[privatePropertyKey] = executeQuery(this);
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
