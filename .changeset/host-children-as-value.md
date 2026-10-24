---
'@ecopages/jsx': patch
'@ecopages/radiant': patch
---

A render-owning `RadiantElement` now receives the JSX children a view passes it as a value, when a view creates it on the client and when a host's view renders it in hydrate-mode SSR, and only its own renderer touches the nodes they render to. `<slot />` in its `render()` shows the parent view's edits wherever they happen: added, removed and reordered children, binding updates, and edits made while the host hid its `<slot />`, which used to be lost with range-drift warnings. In hydrate-mode SSR, a host inside another host's view now renders those children itself, in its hydration marker namespace, and no longer ships a slot-projection payload for them. Plain-mode SSR, where the parent may never render on the client, still renders them as children authored as HTML, with the payload.

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
// x-card: @state header: JsxRenderable = null;
// x-card render(): <header>{this.header}</header><main><slot /></main>
```

An unprefixed name binds as a property on a custom element; use `prop:name` only for a name that binds as an attribute by default, such as `title` or `id`. `<slot name>` still assigns children authored as HTML: markup, DOM-created children, and children rendered on the server outside any host's view or in plain mode.

**Breaking: a host the server rendered outside every host's view keeps the children it rendered.** In hydrate mode the server stamps such a host `data-radiant-ssr="authored"` and ships its children as HTML with a slot-projection payload. On the client it keeps them, with their named slots, and ignores the children of page-level JSX that hydrates over it: a later render of the page JSX no longer changes them, and event bindings in them do not attach. It used to be rebuilt with the page's children. To keep page-level content changing or interactive after hydration, render it inside a host's view, or pass it to the host through a property.

Also changed:

- Nodes appended with DOM APIs to a host fed by a view are no longer projected; they stay where they were put, and development builds warn. Change the children in the parent view instead. Hosts whose children were authored as HTML still project appended nodes.
- `getSlotElements()`, `getSlotElement()` and `@querySlot` return the top-level elements a host's children rendered to, and nothing for a named slot, on a host fed by a view.
- A tag defined after a view rendered it keeps taking those children as HTML, and development builds warn. Define custom elements before rendering the views that use them.
- `@ecopages/jsx` exports `CUSTOM_ELEMENT_CHILDREN_SYMBOL`: a custom element class whose static member under it is `true` receives its JSX children as one value assigned to the element's member under the same key, instead of DOM children.
