export function customElement(name: string, options?: ElementDefinitionOptions) {
  return function <T extends CustomElementConstructor>(_: T, context: ClassDecoratorContext<T>) {
    context.addInitializer(function () {
      customElements.define(name, this, options);
    });
  };
}
