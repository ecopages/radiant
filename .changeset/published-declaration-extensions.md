---
'@ecopages/radiant-ui': patch
'@ecopages/radiant': patch
'@ecopages/signals': patch
'@ecopages/vite-plugin-radiant': patch
'@ecopages/storybook-radiant-vite': patch
---

Published type declarations now use explicit file extensions on relative imports, so TypeScript projects on `moduleResolution` `node16` or `nodenext` resolve the packages' types.
