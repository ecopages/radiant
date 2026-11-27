---
'@ecopages/radiant': minor
---

Read an agent tool's config when the tool is registered, not when the element is constructed, and not at all in a browser without `document.modelContext`. `inputSchema` and `outputSchema` accept a function that returns the schema, and a getter on any property but `name` and `getEnabled` (such as `parse`) is called once per registration, so an app defers building its schema until a visitor's browser can use it. A plain object and a plain `parse` work as before.
