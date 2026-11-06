---
'@ecopages/radiant': minor
---

Add `hostAttributes` to `@customElement` options. A `RadiantElement` host gets those fixed attributes, such as `{ role: 'complementary' }`, during server preparation, so they reach server output, and at the start of every connect, before `onConnected()`. An attribute the author wrote is kept.
