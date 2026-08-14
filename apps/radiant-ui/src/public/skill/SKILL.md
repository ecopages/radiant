---
name: building-with-radiant-ui
description: >-
    Guides agents building interfaces with @ecopages/radiant-ui — focused
    imports, light-DOM views, themes, and semantic tokens. Use when scaffolding
    or composing Radiant UI components, wiring themes, or choosing token packs.
---

# Building with Radiant UI

Radiant UI is a light-DOM component library on the Radiant reactive host model. Custom elements use the `rui-*` tag prefix. Public TypeScript and JSX helpers use the `Rui*` prefix.

## When to use this skill

Read this skill when the task involves:

- Installing or composing `@ecopages/radiant-ui` components in an application
- Loading themes and the aggregate stylesheet
- Choosing colour, spacing, or radius token packs
- Styling or theming against semantic roles instead of palette steps

For exhaustive generated docs, use [/llms.txt](/llms.txt). For `RadiantElement` / `RadiantController` authoring, use the [Radiant skill](https://radiant.ecopages.app/skill/SKILL.md).

## Install and load styles

```bash
pnpm add @ecopages/radiant-ui
```

Radiant, JSX, and Signals install as peers.

Load a theme and the aggregate stylesheet before registering elements. Import focused modules; do not pull the root entry unless the app needs every custom element.

```ts
import '@ecopages/radiant-ui/themes/default';
import '@ecopages/radiant-ui/styles.css';
import '@ecopages/radiant-ui/disclosure';
import { RuiDisclosure, RuiDisclosureGroup } from '@ecopages/radiant-ui/disclosure';
import { RuiButton } from '@ecopages/radiant-ui/button';
```

Presentational helpers that are not custom elements (`RuiButton`, `RuiInput`, `RuiTextarea`, `RuiLabel`, `RuiHeading`, `RuiChip`, and similar) still come from their subpath.

## Composition

- Compose published `Rui*` views. Do not subclass a custom element just to arrange its UI.
- Keep a convenient prop-based default on the primary view, and accept children for the equivalent explicit composition.
- Light DOM is the default: style with theme roles and BEM `.rui-*` classes, not shadow parts.
- Rui views expose a declared DOM surface. Global attributes, `on:*`/`on-native:*`
  events, direct `aria-*`/`data-*`, structured `aria={{ ... }}`/`data={{ ... }}`,
  and `attr:`/`prop:` bindings are forwarded to that surface. Direct kebab-case
  attributes win when both forms name the same value. Collection item `id`
  values (tabs, carousel slides, and cycle-toggle items) are semantic keys, not
  literal DOM ids; non-collection `id` props are DOM ids.
- For an overridable accessible-name default, keep direct `aria-label` in the
  forwarded props and use `withDefaultAriaLabel(aria, fallback)` from
  `@ecopages/radiant-ui/aria`. The helper fills only a missing structured
  `aria.label`; direct `aria-label` remains canonical. Keep managed ARIA state
  explicit rather than passing it through a defaults helper.

## Tokens and themes

Radiant UI separates colour, spacing, and radius into token packs. Components consume semantic roles (`--primary`, `--surface`, `--radius-control`, …). They must never target palette steps such as `--color-havelock-blue-800`.

Start from the default foundation, then layer only the packs the product needs:

```css
@import '@ecopages/radiant-ui/themes/default';
@import '@ecopages/radiant-ui/tokens/spacing/compact';
@import '@ecopages/radiant-ui/tokens/radius/soft';
@import '@ecopages/radiant-ui/styles.css';
```

`data-rui-colors`, `data-rui-spacing`, and `data-rui-radius` are documentation preview attributes. They are not an application API. Do not add them to production markup.

Dark mode remaps colours (including overlay). Spacing, radius, elevation, typography, and motion stay mode-independent unless a theme documents otherwise.

## Critical rules

1. Import `@ecopages/radiant-ui/<slug>` for each component the app ships. Prefer focused imports over the root barrel.
2. Load theme CSS and `styles.css` in the app shell. Component views do not import their own CSS.
3. Style against semantic roles and system tokens, never raw palette steps or ad-hoc Tailwind colour scales.
4. Use native HTML for links, tables, and landmarks. Those are not shipped as widgets.
5. Author new reactive hosts with the Radiant skill. This pack covers consuming Radiant UI, not replacing `@ecopages/radiant`.

## Resources

Start with this skill pack for application work. For the full docs index see [llms.txt](/llms.txt); page exports live under `/llms-content/.../*.txt`.

- [Introduction](/docs/getting-started/introduction)
- [Themes and tokens](/docs/getting-started/theming)
- [Radiant host skill](https://radiant.ecopages.app/skill/SKILL.md)
