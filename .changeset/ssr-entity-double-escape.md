---
'@ecopages/radiant': patch
---

Fix SSR double-escaping of HTML entities. The minimal DOM now decodes entities in parsed text and attribute values, so `&amp;` inside a custom element no longer renders as `&amp;amp;` and JSON in `data-*` attributes survives hydration. Slot projection payloads escape text nodes. Only a small set of named entities (`&amp; &lt; &gt; &quot; &apos; &nbsp; &copy; &reg; &ndash; &mdash; &hellip;`) and numeric references are decoded.
