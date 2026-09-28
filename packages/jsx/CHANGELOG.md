# @ecopages/jsx

## 0.3.0

First stable. Server rendering is Node-only (`AsyncLocalStorage` on `@ecopages/jsx/server`), and host contracts type native plus custom-element JSX without shipping the server entry to the client.

### Breaking Changes

- JSX host contracts expose typed direct `aria-*` and `data-*` channels in addition to structured `aria` / `data` utilities. Direct values take precedence independent of source order. `JsxElementProps<ElementType>` is the native helper contract, including typed `prop:*` bindings. HTML tag names win when HTML and SVG share a name (`a`, `title`). The partial `JsxHtmlProps` and `JsxHtmlPropsWithChildren` aliases are gone; views must declare a native or custom-element host contract.
- `@ecopages/jsx/server` is Node-only. `withForcedServerCustomElementRendering` is gone; custom-element SSR is handled by the server-render pipeline.
- `@ecopages/signals` is a peer dependency. `mapSubscribable` builds signal-backed derivations with `computed` when the source is a `SignalLike`.

### Minor Changes

- [#165](https://github.com/ecopages/radiant/pull/165) [`9d74aac`](https://github.com/ecopages/radiant/commit/9d74aacc9b9325840a6548ae7c2d7b36e605ae78) Thanks [@andeeplus](https://github.com/andeeplus)! - Type direct `aria-*` and `data-*` host channels on custom elements, and keep ARIA attribute tokens from widening to plain `string` in host prop types.

### Patch Changes

- [#257](https://github.com/ecopages/radiant/pull/257) [`df92a7b`](https://github.com/ecopages/radiant/commit/df92a7b32b5b98bf5cd9a1205fe408b367fe639f) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep registered custom-element JSX props (`label`, `tabs`, …) instead of dropping them on the unknown-tag fallback.

- [#250](https://github.com/ecopages/radiant/pull/250) [`9d04586`](https://github.com/ecopages/radiant/commit/9d04586eff13d60b045162eef24301ecd2bf0016) Thanks [@andeeplus](https://github.com/andeeplus)! - Fix hydration of adjacent dynamic text children collapsed into one SSR text node.

    The SSR serializer emits each child value without separators, so `Step {n} of {m}` serializes to `Step 1 of 2` as a single text node. Hydration planning assumed one node per text child, so every child part in the run claimed the whole merged node and scrambled each other's content on the first update (`Step 12 of`). Hydration now splits the merged text node once per child when its text equals the concatenation of the run's serialized values, so each range owns its slice and updates patch in place.

    Preserve empty reactive child positions between adjacent text bindings without duplicating trailing text during hydration.

- [#238](https://github.com/ecopages/radiant/pull/238) [`9a3cf16`](https://github.com/ecopages/radiant/commit/9a3cf16e49f2d20c4441f74c71549545d0fa9277) Thanks [@andeeplus](https://github.com/andeeplus)! - Hydrate template and iterable roots in place, including when the root is a reactive wrapper around the current snapshot. Other shapes fall back to a client render instead of a marker-only scan that attached no live parts.

- [#236](https://github.com/ecopages/radiant/pull/236) [`a864e06`](https://github.com/ecopages/radiant/commit/a864e06b2fb66a2afa645ed09f524d2521bf6ac8) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep fragment hydration subscriptions owned through unmount, preserve keyed fragment identity when every child has a key, render `textarea`/`title`/`style`/`script` children as character data without clobbering unchanged textarea edits, and snapshot one-shot generator children by iterator identity so mount, hydrate, and later renders can read them without a second consume.

- [#147](https://github.com/ecopages/radiant/pull/147) [`263295c`](https://github.com/ecopages/radiant/commit/263295c44755e8516a49b5b913922b10355f307f) Thanks [@andeeplus](https://github.com/andeeplus)! - Serialize nested custom-element light DOM with the active SSR renderer so registered custom elements inside another server-rendered custom element keep the active renderer and hydration state.

- [#74](https://github.com/ecopages/radiant/pull/74) [`beffbbd`](https://github.com/ecopages/radiant/commit/beffbbdf72b6d8353b687e8015089b6d643b867f) Thanks [@andeeplus](https://github.com/andeeplus)! - Serialize reactive `style` object snapshots when applying attributes and during SSR, so callers can bind object styles through signals and subscribables without manual CSS strings.

- [#65](https://github.com/ecopages/radiant/pull/65) [`ba60c0a`](https://github.com/ecopages/radiant/commit/ba60c0a4336d47ede31d6540c4fb15fcc284733a) Thanks [@andeeplus](https://github.com/andeeplus)! - Store active SSR render scope in `AsyncLocalStorage`. `getActiveSsrScopeValue` / `withActiveSsrScopeValue` hold framework-scoped SSR state on the active render.

- Updated dependencies:
    - `@ecopages/signals@0.3.0`
