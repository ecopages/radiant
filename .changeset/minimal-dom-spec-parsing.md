---
'@ecopages/radiant': patch
---

The SSR minimal DOM now parses conforming HTML the way browsers do:

- **Character references:** decoded from the full WHATWG table, including legacy references without a semicolon, the attribute exception, and the C1 remap.
- **Comments:** they are real comment nodes, and bogus comments and `<!doctype>` follow the spec.
- **`textarea` and `title`:** their content is text.
- **Newlines:** CRLF becomes LF, and the newline after `<pre>` is dropped on parse and restored on serialize.
- **Plain `<`:** a `<` that cannot start a tag is text.
- **Duplicate attributes:** the first one wins.
- **`insertAdjacentHTML`:** it honors its position argument. `insertBefore` is added.
