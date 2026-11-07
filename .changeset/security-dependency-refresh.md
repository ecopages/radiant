---
'@ecopages/vite-plugin-radiant': patch
---

The `nitro` peer range moves from `^3.0.260311-beta` to `^3.0.260429-beta`, the first release that fixes the open redirect and the route-rule proxy scope bypass. A prerelease range only matches its own version tuple, so the old range could never select the patched release.
