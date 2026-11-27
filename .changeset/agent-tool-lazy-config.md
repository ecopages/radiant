---
'@ecopages/radiant': minor
---

Read an agent tool's config when the tool is registered, not when the element is constructed, and not at all in a browser without `document.modelContext`. `inputSchema` and `outputSchema` accept a function that returns the schema, and a getter on any property but `name` and `getEnabled` (such as `parse`) is called once per registration. Each of them may also return a promise, such as `inputSchema: () => import('./schema').then((m) => m.json)` or `get parse() { return import('./schema').then((m) => m.parse); }`, so an app loads its schema library only for a visitor whose browser can use it: the tool registers once every promise has settled, never if it was unregistered first, and a promise that rejects is reported with `console.error`. A plain object and a plain `parse` work as before.
