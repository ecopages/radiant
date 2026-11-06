---
'@ecopages/jsx': patch
---

Render half as many DOM nodes for typical markup. Inside a native element whose children are all JSX expressions, adjacent expressions now share one empty marker node and the first and last need none, so `<td>{id}</td>` adds no marker and a four-cell row adds three instead of eight. A row of the js-framework-benchmark table drops from 30 DOM nodes to 15. Custom elements, top-level fragments and hydrated markup keep their markers.
