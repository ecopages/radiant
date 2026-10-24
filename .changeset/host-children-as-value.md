---
'@ecopages/jsx': patch
'@ecopages/radiant': patch
---

A render-owning `RadiantElement` now receives the JSX children a view passes it as a value, on the client and on the server, and only its own renderer touches the nodes they render to. `<slot />` in its `render()` shows the parent view's edits wherever they happen: added, removed and reordered children, binding updates, and edits made while the host hid its `<slot />`, which used to be lost with range-drift warnings. On the server, a host inside another host's view now renders those children itself, in its hydration marker namespace, and no longer ships a slot-projection payload for them.

**Breaking: named regions in JSX are properties.** A JSX child marked `slot="name"` no longer goes to `<slot name="name">` in a host fed by a view: it stays in the default slot, and development builds warn. To migrate, pass the region as a property and render it where the named slot was:

```tsx
// Before
<x-card>
	<h2 slot="header">Title</h2>
	<p>Body</p>
</x-card>
// x-card render(): <header><slot name="header" /></header><main><slot /></main>

// After
<x-card header={<h2>Title</h2>}>
	<p>Body</p>
</x-card>
// x-card: @prop({ transform: { fromAttribute: (value) => value as JsxRenderable } }) header: JsxRenderable = null;
// x-card render(): <header>{this.header}</header><main><slot /></main>
```

An unprefixed name binds as a property on a custom element; use `prop:name` only for a name that binds as an attribute by default, such as `title` or `id`. `<slot name>` still assigns children authored as HTML: markup, DOM-created children, and a page rendered on the server outside any host's view.

Also changed:

- Nodes appended with DOM APIs to a host fed by a view are no longer projected; they stay where they were put, and development builds warn. Change the children in the parent view instead. Hosts whose children were authored as HTML still project appended nodes.
- `getSlotElements()`, `getSlotElement()` and `@querySlot` return the top-level elements a host's children rendered to, and nothing for a named slot, on a host fed by a view.
- A tag defined after a view rendered it keeps taking those children as HTML, and development builds warn. Define custom elements before rendering the views that use them.
- `@ecopages/jsx` exports `CUSTOM_ELEMENT_CHILDREN_SYMBOL`: a custom element class whose static member under it is `true` receives its JSX children as one value assigned to the element's member under the same key, instead of DOM children.
