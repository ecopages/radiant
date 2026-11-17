---
'@ecopages/signals': patch
---

Release each signal of `Watcher.unwatch` just before its own `unwatched` hook, so a hook that writes a signal listed after it still notifies the watcher, and `unwatch` re-arms the watcher whenever it leaves nothing pending, so a later change to a signal that is still watched notifies again. Errors from several failing `unwatched` hooks are now one flat `AggregateError` instead of an aggregate nested inside another.
