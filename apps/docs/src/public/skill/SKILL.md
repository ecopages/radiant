---
name: radiant-reactive-host-author
description: >-
    Author, refactor, review, or explain Radiant reactive hosts built with
    @ecopages/radiant. Use when the user asks for a RadiantElement or
    RadiantController, custom elements with @prop/@state/@signal, controller-attached
    authored DOM, JSX-host rendering, slot projection, SSR hydration, internal
    bindings, or when to use plain reactive reads versus this.$ / this.bindings /
    this.bind(...). Also use when updating docs, examples, or playground code so
    the output follows Radiant's shared reactive host model.
---

# Radiant Reactive Host Author

Author Radiant hosts against the framework's rendering model. Start here; read a reference module only when the task needs it.

- Docs: https://radiant.ecopages.app/docs
- Skill index: https://radiant.ecopages.app/skill.txt
- LLM index: https://radiant.ecopages.app/llms.txt

Use `llms.txt` for a compact map, then the full docs for API details.

## When to use this skill

- Creating or editing a `RadiantElement` or `RadiantController`
- Choosing `@prop` / `@state` / `@signal`, or `@customElement` / `@controller`
- Choosing plain reads (`this.count`) vs bindings (`this.$.count`)
- Wiring SSR, hydration, host rendering, or slot projection
- Reviewing docs or examples so they teach the Radiant model, not React habits

## Import paths

| Surface                                                                                       | From                         |
| --------------------------------------------------------------------------------------------- | ---------------------------- |
| Hosts, `@customElement`, `@controller`, common host decorators                                | `@ecopages/radiant`          |
| `createContext`, `@provideContext`, `@consumeContext`, `@contextSelector`, `@onContextUpdate` | `@ecopages/radiant/context`  |
| SSR helpers                                                                                   | `@ecopages/radiant/server/*` |
| `renderToString`, `withServerCustomElementRenderHook`, SSR scope helpers                      | `@ecopages/jsx/server`       |

## Host choice

- `RadiantElement` — the host owns a custom-element view (JSX-first or imperative).
- `RadiantController` — behavior attaches to authored DOM; no custom-element host.

Same reactive contract. The choice is ownership of the outer host, not a different state model.

## Core model

Not interchangeable:

- `this.count` — raw reactive read; tracked in `render()`; drives host rerenders
- `this.$.count` / `this.bindings.count` / `this.bind('count')` — subscribable JSX binding; patches a stable child or attribute without a full host rerender

Use a **plain read** when the value shapes render logic (branches, comparisons, list shape, slot fallback, `class` / `style` composition, handlers). Use a **binding** for leaf text, whole attribute values, boolean attrs, and `prop:*`. Never use a binding as a raw value in control flow.

```tsx
<article class={this.isExpanded ? 'user-card user-card--expanded' : 'user-card'} data={{ state: this.$.isExpanded }}>
	<h2>{this.$.name}</h2>
</article>
```

Keep `class` and `style` as render-time composition. To style without a host rerender, bind a state attribute (`data={{ state: this.$.status }}`) and key CSS off it.

## Reference modules

Read only the modules relevant to the task. Each file is one level deep from this entry.

| Module                                                     | Read when                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [reference/reactive-model.md](reference/reactive-model.md) | Bindings vs plain reads, derived `.map`, class/style                                  |
| [reference/hosts.md](reference/hosts.md)                   | Element vs controller, public props vs internal bindings types                        |
| [reference/decorators.md](reference/decorators.md)         | `@prop` / `@state` / `@signal`, `@query`, `@onEvent`, `@event`, `@bound`, `@debounce` |
| [reference/context.md](reference/context.md)               | Provide/consume, `@contextSelector` vs `@onContextUpdate`                             |
| [reference/ssr.md](reference/ssr.md)                       | Server entrypoints, hydrate modes, render scope                                       |
| [reference/authoring.md](reference/authoring.md)           | Authoring rules, review checklist, output shape                                       |

## Critical rules

1. Plain reads for control flow and `class`/`style`; bindings for stable JSX output positions.
2. Do not call `.map(...)` inside `render()` — hoist derived bindings to a field.
3. Reassign arrays and objects; in-place mutation does not trigger updates.
4. Omit the `Bindings` generic unless the host uses `this.$`, `this.bindings`, or `this.bind(...)`.
5. `@query` is for DOM the host does not own in its own `render()` — not for writing into nodes it just rendered.
6. Import context from `@ecopages/radiant/context`, not the root entry.
7. Radiant SSR is light-DOM only. Prefer explicit `mode: 'plain'` or `mode: 'hydrate'`.

## Resources

Start with this skill pack. Full docs index: [llms.txt](/llms.txt); page exports under `/llms-content/.../*.txt`.
