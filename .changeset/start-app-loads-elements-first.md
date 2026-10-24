---
'@ecopages/vite-plugin-radiant': patch
'@ecopages/storybook-radiant-vite': patch
---

Load server-discovered Radiant element modules before creating the app JSX so page-level hosts hydrate without late-definition rebuilds.
