---
'@ecopages/radiant': patch
---

Fix SSR double-escaping of HTML entities. The minimal DOM now decodes entities in parsed text and attribute values, so `&amp;` inside a custom element no longer renders as `&amp;amp;` and JSON in `data-*` attributes and slot projection payloads survives hydration. Parsed HTML now serializes exactly as written until it is mutated, so entities the decoder does not know (such as `&euro;`) are kept too. `setAttribute` and child insertion on a parsed element no longer drop its children, and `script` / `style` content is never escaped.
