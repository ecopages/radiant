---
'@ecopages/radiant': minor
---

Breaking: `@agentTool`, `createAgentTool` and `registerAgentTool` read their config as given again. The 0.13 lazy forms are removed: a function for `inputSchema` or `outputSchema`, and a getter or promise for `parse`. `inputSchema` and `outputSchema` are JSON Schema objects and `parse` is a synchronous function, so a spread copy of a config reads nothing. Registration no longer waits for a promise, and a getter on any field other than `name` and `getEnabled` runs when the element is constructed. Migrate a schema function to a static object generated at build time, for example with `z.toJSONSchema`, and a getter `parse` to a plain function or to validation on the server the tool calls.
