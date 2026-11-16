---
'@ecopages/jsx': patch
---

Stop writing a function in a child, `attr`, `bool`, `class`, `classes` or `style` position, a `style` object value, or a function that a signal or subscribable resolves to, out as its source code, in the DOM and in `renderToString` (plain and hydrate): the child renders nothing and the attribute or declaration is left off. The development runtime (`@ecopages/jsx/jsx-dev-runtime`) warns once per position, naming it. `prop:` bindings, event handlers and a custom element's properties keep a function as a value.
