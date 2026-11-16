---
'@ecopages/signals': patch
---

Make `subtle.Watcher.watch(...)` and a computed's first watch release what they started watching and rethrow the original error when a `watched` hook throws. A throwing `unwatched` hook no longer stops a release: every signal and dependency is released first, then the error is rethrown, several as an `AggregateError`.
