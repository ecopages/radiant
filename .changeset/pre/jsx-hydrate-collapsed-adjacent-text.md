---
'@ecopages/jsx': patch
---

Fix hydration of adjacent dynamic text children collapsed into one SSR text node.

The SSR serializer emits each child value without separators, so `Step {n} of {m}` serializes to `Step 1 of 2` as a single text node. Hydration planning assumed one node per text child, so every child part in the run claimed the whole merged node and scrambled each other's content on the first update (`Step 12 of`). Hydration now splits the merged text node once per child when its text equals the concatenation of the run's serialized values, so each range owns its slice and updates patch in place.

Preserve empty reactive child positions between adjacent text bindings without duplicating trailing text during hydration.
