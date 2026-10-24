---
'@ecopages/radiant': patch
---

Ship Radiant's development warnings in the published package: the delegated `@onEvent` listener on a non-bubbling event such as `focus`, the JSX child marked `slot="name"` and the nodes appended to a host fed by a view, and the tag defined after a view rendered it. The published files now keep the `process.env.NODE_ENV` check, so an app's development build logs these warnings and its production build removes them. A page that loads the files without a bundler gets no warnings and no error.
