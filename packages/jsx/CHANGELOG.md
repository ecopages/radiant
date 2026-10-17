# @ecopages/jsx

## 0.4.0

### Minor Changes

- [#320](https://github.com/ecopages/radiant/pull/320) [`dad8379`](https://github.com/ecopages/radiant/commit/dad8379fae51087328da8946e6a0c53bdb55f724) Thanks [@andeeplus](https://github.com/andeeplus)! - Server-rendered Radiant hosts now receive their JSX children as light-DOM nodes rather than an HTML string that the minimal DOM parses back. Text and attribute values are never escaped and re-parsed, and `<style>` children keep their CSS (the string path escaped `>` and `&` inside it).

    New in jsx:

    - **`renderServerLightDom(value, ownerDocument)`** is exported from `@ecopages/jsx/server`.
    - **Text-only element helpers** for `script`, `style`, `textarea` and `title` now live in a DOM-free module that the server and the client share.

### Patch Changes

- [#321](https://github.com/ecopages/radiant/pull/321) [`c9cc095`](https://github.com/ecopages/radiant/commit/c9cc095366e09d0251684a290d049f68f4c75369) Thanks [@andeeplus](https://github.com/andeeplus)! - Fix hydration of reactive bindings inside a custom element's JSX children when the render root is a fragment. A custom-element child of a fragment root was hydrated like an ordinary element, so the bindings in its children kept their server values. It is now reconciled the same way as under a non-fragment root.

- [#320](https://github.com/ecopages/radiant/pull/320) [`4bf5a10`](https://github.com/ecopages/radiant/commit/4bf5a10a96e2c72ffb21714b5442516eb86baf7d) Thanks [@andeeplus](https://github.com/andeeplus)! - Context consumers passed as JSX children of a provider host now resolve that provider during SSR, where they used to render their fallback.

    - **jsx:** `withServerCustomElementRenderHook` takes an `ownsChildren` option. With it, the hook context's `applyChildren()` lets the framework choose when the children serialize; `context.children` holds the raw JSX.
    - **Radiant:** the bridge uses this to apply a host's children inside its context providers.

    Hooks registered without the option behave as before.

- [#320](https://github.com/ecopages/radiant/pull/320) [`6ff24ce`](https://github.com/ecopages/radiant/commit/6ff24cee309429cf2332d8be6e95c9a73ea194d1) Thanks [@andeeplus](https://github.com/andeeplus)! - Fix hydrate-mode SSR of JSX children passed to a nested custom element. The children no longer take hydration marker indexes from the enclosing render, which shifted every later sibling marker so hydration left stale markers or fell back to a full client render, and made Radiant hosts on a full DOM drop their slotted content.
- Updated dependencies []:
    - @ecopages/signals@0.4.0

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
