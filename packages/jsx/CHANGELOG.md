# @ecopages/jsx

## 0.5.1

### Patch Changes

- [#401](https://github.com/ecopages/radiant/pull/401) [`cf99195`](https://github.com/ecopages/radiant/commit/cf99195398fcea80d4fe305f5478635d56fb15a7) Thanks [@andeeplus](https://github.com/andeeplus)! - A render-owning `RadiantElement` now receives the JSX children a view passes it as a value, when a view creates it on the client and when a host's view renders it in hydrate-mode SSR, and only its own renderer touches the nodes they render to. `<slot />` in its `render()` shows the parent view's edits wherever they happen: added, removed and reordered children, binding updates, and edits made while the host hid its `<slot />`, which used to be lost with range-drift warnings. In hydrate-mode SSR, a host inside another host's view now renders those children itself, in its hydration marker namespace, and no longer ships a slot-projection payload for them. Plain-mode SSR, where the parent may never render on the client, still renders them as children authored as HTML, with the payload.

    **Breaking: named regions in JSX are properties.** A JSX child marked `slot="name"` no longer goes to `<slot name="name">` in a host fed by a view: it stays in the default slot, and development builds warn. To migrate, pass the region as a property and render it where the named slot was:

    ```tsx
    // Before
    <x-card>
    	<h2 slot="header">Title</h2>
    	<p>Body</p>
    </x-card>
    // x-card render(): <header><slot name="header" /></header><main><slot /></main>

    // After
    <x-card header={<h2>Title</h2>}>
    	<p>Body</p>
    </x-card>
    // x-card: @state header: JsxRenderable = null;
    // x-card render(): <header>{this.header}</header><main><slot /></main>
    ```

    An unprefixed name binds as a property on a custom element; use `prop:name` only for a name that binds as an attribute by default, such as `title` or `id`. `<slot name>` still assigns children authored as HTML: markup, DOM-created children, and children rendered on the server outside any host's view or in plain mode.

    **Breaking: a host the server rendered outside every host's view keeps the children it rendered when some fill a named slot.** In hydrate mode the server stamps such a host `data-radiant-ssr="authored"` and ships its children as HTML with a slot-projection payload. A host whose children only fill its default slot is not affected: it takes the page JSX's children as a value, with live bindings. On the client it keeps them, with their named slots, and ignores the children of page-level JSX that hydrates over it: a later render of the page JSX no longer changes them, and event bindings in them do not attach. It used to be rebuilt with the page's children. To keep page-level content changing or interactive after hydration, render it inside a host's view, or pass it to the host through a property.

    Also changed:

    - Nodes appended with DOM APIs to a host fed by a view are no longer projected; they stay where they were put, and development builds warn. Change the children in the parent view instead. Hosts whose children were authored as HTML still project appended nodes.
    - `getSlotElements()`, `getSlotElement()` and `@querySlot` return the top-level elements a host's children rendered to, and nothing for a named slot, on a host fed by a view.
    - A tag defined after a view rendered it keeps taking those children as HTML, and development builds warn. Define custom elements before rendering the views that use them.
    - `@ecopages/jsx` exports `CUSTOM_ELEMENT_CHILDREN_SYMBOL`: a custom element class whose static member under it is `true` receives its JSX children as one value assigned to the element's member under the same key, instead of DOM children.

- [#430](https://github.com/ecopages/radiant/pull/430) [`6c0c391`](https://github.com/ecopages/radiant/commit/6c0c391f9304fda1156f3241c4d3fdbff68d6c50) Thanks [@andeeplus](https://github.com/andeeplus)! - Preserve matching nested custom-element hosts during hydration so their lifecycle callbacks do not run again when a parent attaches or rerenders.

- [#409](https://github.com/ecopages/radiant/pull/409) [`a212331`](https://github.com/ecopages/radiant/commit/a2123318f90aa39d759de50047ba816bb3653532) Thanks [@andeeplus](https://github.com/andeeplus)! - A render-owning `RadiantElement` inside another host's view now keeps its server-rendered node when the parent hydrates, instead of being replaced by a new client instance. Its view, the children the parent passed it (as JSX children or through a property), focus, selection and typed input survive, the parent no longer builds a second instance of it, and `isServerRendered` reports `true`.

    - In hydrate-mode SSR, a nested host that receives JSX children is stamped `data-radiant-ssr="children"`. With the hydrator installed it stays inert until the parent's view hands it its children (no event bindings; the first `@bindTo` flush, `onConnected()` and `updated()` wait, and so do render requests; a write to a `@bindTo` field still reaches its target), then hydrates, whichever of the two tags is defined first. A nested host whose parent never renders on the client stays inert server markup.
    - A server-rendered host now hydrates even when its own view has no hydration marker, for example a view whose only bindings are on the hosts it renders.
    - `hydrate()` from `@ecopages/jsx` keeps the server node of a custom element that takes its children as a value (`CUSTOM_ELEMENT_CHILDREN_SYMBOL`) and binds only that element's own attributes, properties, events and children. It counts hydration markers inside nested custom elements when deciding whether the target holds server output, and inserts empty text nodes of a child list, which the server markup has no node for.
    - Other custom elements, a tag defined only after the parent hydrated, and server markup that does not match the view are still rendered again by the parent.

- [#399](https://github.com/ecopages/radiant/pull/399) [`eb9bbde`](https://github.com/ecopages/radiant/commit/eb9bbde483950e544fdc490c4cf0a660a9cd5a28) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep nodes when a child list empties or a conditional child toggles. A child expression now keeps its place in the template whatever value it holds, so the template shape follows the authored markup: `<section>{items.map(…)}</section>` keeps the `<section>` (or custom element host) when `items` becomes empty, and `<>{a}{cond ? b : null}</>` keeps `a` when `cond` flips. Rebuilt nodes used to lose focus, typed input, scroll position and custom element state. SSR markup is unchanged.

    The values `jsx()` and `jsxs()` produce change shape accordingly. A fragment with several children resolves to one entry per child, with `null` for an empty one, and a non-empty list stays a list even with one entry, where it used to collapse to its only item. Lists are no longer flattened: an empty item stays a `null` entry and a nested list stays one nested entry, even when all its items are keyed. When every filled item is itself keyed, the list drops its holes and reconciles by key. Hydrating a fragment root that holds a nested list now reconnects the server DOM instead of falling back to a client render.

- [#440](https://github.com/ecopages/radiant/pull/440) [`9ee89f9`](https://github.com/ecopages/radiant/commit/9ee89f964fdffc0f7ae3e9a727a02cff3a306115) Thanks [@andeeplus](https://github.com/andeeplus)! - Keyed children keep their nodes when an unkeyed sibling appears or disappears, including a keyed group such as `rows.map(...)` beside a conditional item, in a list or a fragment, under `jsx`, `jsxs` and `jsxDEV` alike. A mapped list now keeps its own range inside its parent instead of being merged into it. `jsxDEV` now passes static children to `jsxs`, so development builds slot children as production builds do. In a list that mixes keyed and unkeyed children, a duplicate key renders once, at its first position, as it does in a keyed list.

    **Breaking:** keys now match within one list only. A nested list whose items are all keyed is no longer merged into its parent list, so an item that moves from one mapped group to another, or a group with another group inserted before it, is rebuilt. To keep their nodes, key the groups too: `groups.map((group) => <Fragment key={group.id}>{group.items.map(renderItem)}</Fragment>)`.

- [#418](https://github.com/ecopages/radiant/pull/418) [`4f73e51`](https://github.com/ecopages/radiant/commit/4f73e51003ad801448614461528930e2e2b5036d) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep nested custom elements connected when their parent rerenders, including when that rerender follows hydration.

- [#436](https://github.com/ecopages/radiant/pull/436) [`7a8d32b`](https://github.com/ecopages/radiant/commit/7a8d32b97e9fb883be3b05c13814d2a45b81d91f) Thanks [@andeeplus](https://github.com/andeeplus)! - Reconnect a markerless page root when a nested element that owns its content through its own client root, such as a custom-element host, has already hydrated or rendered itself, even if it updated since, preserving that element's node, its state and its named-slot content.

- [#415](https://github.com/ecopages/radiant/pull/415) [`f1bbbf6`](https://github.com/ecopages/radiant/commit/f1bbbf6b8edd833e2b934779857338c5013c83d1) Thanks [@andeeplus](https://github.com/andeeplus)! - Resolve reactive values before assigning them to SSR-capable custom-element instances, so their renderer can reflect current attribute and property state in plain and hydrate output instead of seeing reactive wrapper objects.

- [#424](https://github.com/ecopages/radiant/pull/424) [`a806505`](https://github.com/ecopages/radiant/commit/a806505a57bd6f0b36b9eafbb16a61c985f487d0) Thanks [@andeeplus](https://github.com/andeeplus)! - **Breaking (types only): the `rui-meter`, `rui-toc`, `rui-toast`, `rui-toaster`, `rui-date-input` and `rui-calendar` tags reject children.** These tags are rendered by their views and never read children, so a body child is now a type error. To migrate, remove the children, or pass the content through the view's props.

    Also changed: a hydrated element's properties are written once instead of twice, the separator view rejects children like the other views, and the docs and the published typings describe named regions as properties.

- Updated dependencies []:
    - @ecopages/signals@0.5.1

## 0.5.0

### Patch Changes

- Updated dependencies []:
    - @ecopages/signals@0.5.0

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
