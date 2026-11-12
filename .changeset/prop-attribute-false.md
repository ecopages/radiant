---
'@ecopages/radiant': minor
---

`@prop` accepts `attribute: false` to make a prop property-only: it has no observed attribute, ignores an authored attribute of that name, is never reflected and is never written into server-rendered markup. Use it for live objects such as class instances, which were serialized into the HTML, lost their methods on the client and, when cyclic, made server rendering throw. In development, server rendering now warns once per tag and prop when a prop that keeps its attribute holds a class instance, function or cycle, and points to `attribute: false`. `reflect: true` with `attribute: false` throws.
