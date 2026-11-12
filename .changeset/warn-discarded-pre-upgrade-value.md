---
'@ecopages/radiant': patch
---

In development, a value assigned to an element before it was upgraded now warns when it is lost: for `@state` and `@signal`, which are internal and keep their initializer, and for a property that shadows a class accessor (a hand-written `get`/`set`, an `accessor` field or a library accessor decorator), whose setter and reactivity never see it. Each warning fires once per tag and member and points to `@prop`, which adopts a value set before upgrade. Production builds drop the warnings.
