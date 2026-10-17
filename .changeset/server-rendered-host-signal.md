---
'@ecopages/radiant': minor
---

Add `RadiantElement#isServerRendered`, a supported signal that a host was first connected from markup that hydrate-mode SSR produced. Hydrate-mode SSR now stamps every host it serializes with a `data-radiant-ssr` attribute, which the host reads once at first connect.

`hasHydrationMarkers` cannot answer this: it only finds markers where a view has bindings, and the JSX children of a custom element carry none. A host that adopts server-rendered content, such as light-DOM children its parent view authored, should check `isServerRendered` instead. Exact-match assertions on hydrate-mode host tags need `data-radiant-ssr` added.
