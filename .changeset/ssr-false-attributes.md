---
'@ecopages/jsx': patch
---

Fix: server rendering no longer drops an attribute whose value is `false`. `aria-expanded={false}`, `data-open={false}` and `attr:wrap={false}` now serialize as `="false"` in `renderToString` and in the light DOM of a server-rendered custom element, as the client already writes them, so the server markup and the hydrated DOM agree. HTML boolean attributes such as `hidden` and `disabled` keep presence and absence, and `null` and `undefined` still remove an attribute.
