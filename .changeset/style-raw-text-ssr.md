---
'@ecopages/jsx': patch
---

String SSR now keeps children of HTML raw-text elements (`style`, `script`, `xmp`, `iframe`, `noembed`, `noframes`) as raw text, so CSS such as `.a > .b` is not turned into `&gt;`. Only that tag's `</name` sequence is escaped, so the content cannot close the element early. `textarea` and `title` stay entity-escaped. The set is exported as `RAW_TEXT_ELEMENT_NAMES` from `@ecopages/jsx/raw-text`.
