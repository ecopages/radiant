---
'@ecopages/radiant': minor
---

`@onEvent` accepts `host: true` to listen on the Element Host itself, which makes non-bubbling events such as `pointerenter` and `pointerleave` usable. The dev warning for delegated non-bubbling events now covers `pointerenter` and `pointerleave`. `OnEventConfig` now takes exactly one target: a config that combines targets, such as `host` with `selector`, is a type error instead of attaching both listeners.
