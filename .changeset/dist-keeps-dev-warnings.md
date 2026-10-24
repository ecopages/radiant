---
'@ecopages/radiant': patch
---

Ship the development warning for a delegated `@onEvent` listener on a non-bubbling event, such as `focus`, in the published package. The published files now keep the `process.env.NODE_ENV` check, so an app's development build logs the warning and its production build removes it. A page that loads the files without a bundler gets no warning and no error.
