---
'@ecopages/radiant-ui': minor
---

Add `getHref` to `RuiPagination` and `RuiPaginationNav`. Each available page control then renders as an `<a>` to `getHref(page)`, with `aria-current="page"` on the current page, so a listing that pages by URL works without JavaScript. The browser handles a click on a link and `rui-page-change` is not emitted for it, in custom markup too when the control is an `<a href>`; an unavailable previous or next control stays a disabled button.
