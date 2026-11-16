---
'@ecopages/jsx': patch
---

Stop writing a function in a child, `attr`, `bool`, `class`, `classes` or `style` position out as its source code, in the DOM and in `renderToString` (plain and hydrate): the child renders nothing and the attribute is left off. `jsxDEV` from `@ecopages/jsx/jsx-dev-runtime` warns once per position, naming the tag and attribute. `prop:` bindings, event handlers and a custom element's properties keep a function as a value.
