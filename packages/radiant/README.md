# Radiant

Radiant is a minimalist web component library designed for simplicity and flexibility.

It leverages the light DOM, allowing components to be styled and manipulated with standard CSS and JavaScript, unlike traditional web components that use the shadow DOM.

This approach deviates from conventional [web component best practices](https://web.dev/articles/custom-elements-best-practices), offering a trade-off for a more streamlined development experience.

Ideal for any kind of projects, Radiant provides a lightweight alternative to full web components implementations, reducing unnecessary overhead.

For more details, [see the docs page](https://radiant.ecopages.app/).

## How to install it

```sh
bun install @ecopages/radiant
```

## Import Structure

| Folder/Module                 | Description                             |
| ----------------------------- | --------------------------------------- |
| `./`                          | Contains all modules.                   |
| `./context`                   | Contains all modules related to contex. |
| `./context/create-context`    | Module for creating context.            |
| `./context/context-provider`  | Module for providing context.           |
| `./context/consume-context`   | Module for consuming context.           |
| `./context/provide-context`   | Module for providing context.           |
| `./context/context-selector`  | Module for selecting context.           |
| `./core`                      | Contains all core elements              |
| `./core/radiant-element`      | Module for the Radiant Element.         |
| `./decorators`                | Contains decorator modules.             |
| `./decorators/custom-element` | Decorator for custom elements.          |
| `./decorators/event`          | Decorator for events.                   |
| `./decorators/on-event`       | Decorator for event handlers.           |
| `./decorators/on-updated`     | Decorator for update handlers.          |
| `./decorators/query`          | Decorator for querying elements.        |
| `./decorators/reactive-field` | Decorator for reactive fields.          |
| `./decorators/reactive-prop`  | Decorator for reactive properties.      |
| `./mixins`                    | Contains mixin modules.                 |
| `./mixins/with-kita`          | Mixin for Kita functionality.           |
| `./tools`                     | Contains utility modules.               |
| `./tools/stringify-attribute` | Utility for stringifying attributes.    |
| `./tools/event-emitter`       | Utility for emitting events.            |
| `./utils`                     | Contains additional utility modules.    |
