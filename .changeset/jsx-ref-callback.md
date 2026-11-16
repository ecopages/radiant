---
'@ecopages/jsx': minor
---

Add `ref` to every intrinsic element, custom elements included: a callback called with the node once it is in the page, including the server node adopted during hydration. A function it returns runs on removal; otherwise the callback is called once more with `null`. It never runs on the server and is never serialized. This also fixes `ref={fn}` writing the function's source into the DOM and the server HTML, and assigning it as a property on custom elements.
