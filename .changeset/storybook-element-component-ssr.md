---
'@ecopages/storybook-radiant-vite': patch
---

Render SSR stories whose `meta.component` is a custom-element constructor and that have no `render`. The server and the hydrated preview rendered such a story by calling the class as a function, which threw `Class constructor ... cannot be invoked without 'new'`; they now render its host element with the story args, as the client render does.
