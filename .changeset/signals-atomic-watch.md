---
'@ecopages/signals': patch
---

Make `subtle.Watcher.watch(...)` and a computed's first watch atomic: when a `watched` hook throws, everything watched during that attempt is released in reverse order, the watcher is left as before and the original error is rethrown. A throwing `unwatched` hook no longer stops the release: every signal and dependency is released first, then the error is rethrown.
