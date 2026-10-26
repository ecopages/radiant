---
'@ecopages/radiant': minor
---

**Breaking:** `@customElement` rejects customized built-ins. A defined `extends` option throws a `TypeError` and no longer type-checks. Replace `@customElement('fancy-button', { extends: 'button' }) class FancyButton extends HTMLButtonElement` with an autonomous element (`@customElement('fancy-button') class FancyButton extends RadiantElement` that renders its own `<button>`), and `<button is="fancy-button">` with `<fancy-button>`.
