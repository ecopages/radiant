---
'@ecopages/storybook-radiant-vite': patch
---

Install required Storybook preview packages on Node `globalThis` during Vite SSR so `ssrLoadModule` can evaluate stories and shared helper modules that import `storybook/test` and sibling preview packages.
