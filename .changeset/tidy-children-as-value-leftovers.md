---
'@ecopages/jsx': patch
'@ecopages/radiant': patch
'@ecopages/radiant-ui': patch
---

**Breaking (types only): the `rui-meter`, `rui-toc`, `rui-toast`, `rui-toaster`, `rui-date-input` and `rui-calendar` tags reject children.** These tags are rendered by their views and never read children, so a body child is now a type error. To migrate, remove the children, or pass the content through the view's props.

Also changed: a hydrated element's properties are written once instead of twice, the separator view rejects children like the other views, and the docs and the published typings describe named regions as properties.
