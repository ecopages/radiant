---
'@ecopages/jsx': patch
---

Fix hydrate-mode SSR of JSX children passed to a nested custom element. The children no longer take hydration marker indexes from the enclosing render, which shifted every later sibling marker so hydration left stale markers or fell back to a full client render, and made Radiant hosts on a full DOM drop their slotted content.
