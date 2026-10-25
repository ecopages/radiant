---
'@ecopages/vite-plugin-radiant': patch
'@ecopages/storybook-radiant-vite': patch
---

Load server-discovered Radiant element modules before creating the app JSX so page-level hosts hydrate without late-definition rebuilds. The `bootstrap` callback now runs after those modules load and the hosts upgrade; move code that must run before a host connects into a module loaded earlier.
