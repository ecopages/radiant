---
'@ecopages/vite-plugin-radiant': patch
---

Component stylesheets linked through `resolveRadiantSsrStyleAssets()` now load in production. The browser build writes every stylesheet that `elements.styles` matches, and the server-rendered HTML links to those files instead of to asset URLs only the server build knew, which returned 404.
