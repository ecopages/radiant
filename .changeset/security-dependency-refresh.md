---
'@ecopages/vite-plugin-radiant': patch
---

The `nitro` peer range is now `^3` instead of `^3.0.260311-beta`. Nitro 3 publishes dated prereleases, and a prerelease range only matches its own version tuple, so the old range could not select a fixed release. Any Nitro 3 release is accepted, including the one that fixes the open redirect and the route-rule proxy scope bypass.
