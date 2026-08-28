---
'@ecopages/storybook-radiant-vite': patch
---

Install Storybook preview packages on Node `globalThis` during Vite SSR so `ssrLoadModule` can evaluate stories and shared play helpers that import `storybook/test` and sibling preview packages.
