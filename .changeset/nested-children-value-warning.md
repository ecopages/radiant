---
'@ecopages/radiant': patch
---

Warn in development when a server-rendered host nested in another host's view is still waiting for its children one second after the page has loaded, because its parent's tag is not defined on the client. The warning names that tag.
