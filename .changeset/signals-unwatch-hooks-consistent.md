---
'@ecopages/signals': patch
---

Release each signal of `Watcher.unwatch` just before its own `unwatched` hook, so a hook that writes a signal listed after it still notifies the watcher. Errors from several failing `unwatched` hooks are now one flat `AggregateError` instead of an aggregate nested inside another.
