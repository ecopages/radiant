---
'@ecopages/radiant': patch
---

Stop leftover `</div>` text from appearing next to date fields during SSR. Void inputs no longer serialize as `</input>`, and the HTML tokenizer matches element bounds with a tag-name stack so stray void closing tags do not split ancestor wrappers. Stack walks skip eager `innerHtml` extraction so boundary scans stay linear.
