# Agent instructions

Working rules for `packages/radiant-ui`. Architecture: [`src/components/ui/README.md`](./src/components/ui/README.md). Tokens and CSS: [`DESIGN.md`](./DESIGN.md). Storybook overview and file layout: `src/Introduction.mdx`. Package scripts: [`README.md`](./README.md).

Do not load root [`CONTEXT.md`](../../CONTEXT.md) for catalog-only work. Catalog terms are defined in the ui README.

When authoring behavior changes, update the README beside the code.

## Invariants

- **Authored Children** stay in parent JSX. Do not project them through CE `<slot>` / `render()`.
- Default host shape is a **View-owned Shell**. Keep `render()` only for a **Derived Tree**.
- A **Binding** (`this.$`) only patches the host's own `render()` / `hydrate()` tree. Omit the `Bindings` generic unless the script uses `this.$`, `this.bindings`, or `this.bind(...)`.
- Post-sync setup: `onConnected()`, not `connectedCallback` + `queueMicrotask(sync)`.
- Named regions are **Composition Helpers** or named view props, not HTML slots.
- Do not bind `hidden` in the view when the custom element toggles it with `toggleAttribute`.
- Cross-cutting helpers: `src/lib/` → `@/lib/...`. Same-component and sibling UI: `./` and `../` only.
- CEM: `@slot` only when HTML projection is the public API; do not add `@csspart` (light DOM). Document Composition Helpers with `@cssclass` on the view. The CE class TSDoc must include the light-DOM query contract (targets the host reads, attrs it writes). Component docs pages live under `apps/radiant-ui`. Playbook: [`.agents/skills/radiant-ui-docs/`](../../.agents/skills/radiant-ui-docs/SKILL.md).
