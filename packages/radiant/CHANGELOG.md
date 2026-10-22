# @ecopages/radiant

## 0.4.0

### Minor Changes

- [#326](https://github.com/ecopages/radiant/pull/326) [`375b200`](https://github.com/ecopages/radiant/commit/375b20007b1a93778e1f907838e6365881420260) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `RadiantElement#isServerRendered`, a supported signal that a host was first connected from markup that hydrate-mode SSR produced. Hydrate-mode SSR now stamps every host it serializes with a `data-radiant-ssr` attribute, which the host reads once at first connect and then removes, as hydration markers are.

    `hasHydrationMarkers` cannot answer this: it only finds markers where a view has bindings, and the JSX children of a custom element carry none. A host that adopts server-rendered content, such as light-DOM children its parent view authored, should check `isServerRendered` instead. The stamp name is exported as `SERVER_RENDERED_HOST_ATTRIBUTE` for integrators that write the host tag around `renderViewToString`. Plain-mode hosts are not stamped. Exact-match assertions on hydrate-mode host tags need `data-radiant-ssr` added.

### Patch Changes

- [#320](https://github.com/ecopages/radiant/pull/320) [`33f9c54`](https://github.com/ecopages/radiant/commit/33f9c549f4bb23c5c6dcd8efc98d4f070a8ce88d) Thanks [@andeeplus](https://github.com/andeeplus)! - Fix two SSR minimal-DOM parsing bugs. Markup-like strings inside `script` and `style` (such as `"<div>"`) no longer open tags and swallow the rest of the parent element, and `textContent` of parsed HTML no longer leaks attribute text after a `>` in an attribute value.

- [#320](https://github.com/ecopages/radiant/pull/320) [`3f137ca`](https://github.com/ecopages/radiant/commit/3f137caf6c7418c4b105c45a23422c5a44f70fcb) Thanks [@andeeplus](https://github.com/andeeplus)! - Harden the SSR minimal DOM serializer. Serializing a tree after a mutation no longer takes time exponential in its depth, parsed text is only written back from its source while that source still means the same thing, and self-closing custom elements nested in parsed markup serialize with an explicit close tag so browsers re-parse the same tree.

- [#320](https://github.com/ecopages/radiant/pull/320) [`dc5b87f`](https://github.com/ecopages/radiant/commit/dc5b87f6f5d4b2275cff0eb2dd9b4904f0321107) Thanks [@andeeplus](https://github.com/andeeplus)! - The SSR minimal DOM now parses conforming HTML the way browsers do:

    - **Character references:** decoded from the full WHATWG table, including legacy references without a semicolon, the attribute exception, and the C1 remap.
    - **Comments:** they are real comment nodes, and bogus comments and `<!doctype>` follow the spec.
    - **`textarea` and `title`:** their content is text.
    - **Newlines:** CRLF becomes LF, and the newline after `<pre>` is dropped on parse and restored on serialize.
    - **Plain `<`:** a `<` that cannot start a tag is text.
    - **Duplicate attributes:** the first one wins.
    - **`insertAdjacentHTML`:** it honors its position argument. `insertBefore` is added.

- [#320](https://github.com/ecopages/radiant/pull/320) [`e5b9ff6`](https://github.com/ecopages/radiant/commit/e5b9ff62ac3ed1eba201d08e8054a12142d045c2) Thanks [@andeeplus](https://github.com/andeeplus)! - The SSR minimal DOM gains the node-traversal and node-editing APIs that component code reads: `prepend`, `before`, `after`, `replaceWith`, `remove`, `firstChild`, `lastChild`, `nextSibling`, `previousSibling`, the `*ElementChild` / `*ElementSibling` accessors, `childElementCount`, `document.createComment` and `document.createElementNS`.

    The DOM-detection probe no longer reads accessors on an object that is not an element. Real engines reject that read with "Illegal invocation", so SSR setup now works when it runs inside a browser.

- [#320](https://github.com/ecopages/radiant/pull/320) [`0121714`](https://github.com/ecopages/radiant/commit/0121714d5e3358e65256c5231cd614bd8ab81c60) Thanks [@andeeplus](https://github.com/andeeplus)! - Slot projection payloads no longer include the data of comment nodes. The payload is turned into markup on the client, and comment data was written into it unescaped.

- [#320](https://github.com/ecopages/radiant/pull/320) [`dad8379`](https://github.com/ecopages/radiant/commit/dad8379fae51087328da8946e6a0c53bdb55f724) Thanks [@andeeplus](https://github.com/andeeplus)! - Server-rendered Radiant hosts now receive their JSX children as light-DOM nodes rather than an HTML string that the minimal DOM parses back. Text and attribute values are never escaped and re-parsed, and `<style>` children keep their CSS (the string path escaped `>` and `&` inside it).

    New in jsx:

    - **`renderServerLightDom(value, ownerDocument)`** is exported from `@ecopages/jsx/server`.
    - **Text-only element helpers** for `script`, `style`, `textarea` and `title` now live in a DOM-free module that the server and the client share.

- [#320](https://github.com/ecopages/radiant/pull/320) [`4bf5a10`](https://github.com/ecopages/radiant/commit/4bf5a10a96e2c72ffb21714b5442516eb86baf7d) Thanks [@andeeplus](https://github.com/andeeplus)! - Context consumers passed as JSX children of a provider host now resolve that provider during SSR, where they used to render their fallback.

    - **jsx:** `withServerCustomElementRenderHook` takes an `ownsChildren` option. With it, the hook context's `applyChildren()` lets the framework choose when the children serialize; `context.children` holds the raw JSX.
    - **Radiant:** the bridge uses this to apply a host's children inside its context providers.

    Hooks registered without the option behave as before.

- [#320](https://github.com/ecopages/radiant/pull/320) [`2f53f5b`](https://github.com/ecopages/radiant/commit/2f53f5b1c67ae9ae52092b75fb30bb84acdb0234) Thanks [@andeeplus](https://github.com/andeeplus)! - Fix SSR double-escaping of HTML entities. The minimal DOM now decodes entities in parsed text and attribute values, so `&amp;` inside a custom element no longer renders as `&amp;amp;` and JSON in `data-*` attributes and slot projection payloads survives hydration. Parsed HTML now serializes exactly as written until it is mutated, so entities the decoder does not know (such as `&euro;`) are kept too. `setAttribute` and child insertion on a parsed element no longer drop its children, and `script` / `style` content is never escaped.
- Updated dependencies [[`c9cc095`](https://github.com/ecopages/radiant/commit/c9cc095366e09d0251684a290d049f68f4c75369), [`dad8379`](https://github.com/ecopages/radiant/commit/dad8379fae51087328da8946e6a0c53bdb55f724), [`4bf5a10`](https://github.com/ecopages/radiant/commit/4bf5a10a96e2c72ffb21714b5442516eb86baf7d), [`6ff24ce`](https://github.com/ecopages/radiant/commit/6ff24cee309429cf2332d8be6e95c9a73ea194d1)]:
    - @ecopages/jsx@0.4.0
    - @ecopages/signals@0.4.0

## 0.3.0

First stable of the light-DOM platform. Custom elements render into authored light DOM, host state is signals-backed, and SSR keeps the JSX server entry off the client.

### Breaking Changes

- Light DOM only: `renderRootMode` and the `scope` option on `@query`, `@onEvent`, `createQuery`, and `createEventListener` are gone.
- `RadiantElement` and `RadiantController` no longer expose `notifyUpdate`, `getReactiveBinding` (use `bind`), `registerPostSyncCallback`, `registerUpdatedCallback`, `registerContextProvider`, `registerHydrationBinding`, `getContextProviders`, `getHydrationBindings`, `getSsrContextProviders`, `getSsrHydrationBindings`, `flushPostSyncCallbacks`, or `registerEventEmitter`. Decorators and SSR adapters use `REACTIVE_HOST`.
- Removed `trackReactiveRead`, `registerReactiveDependencyReader`, and the exported `ReactiveField` type. Use `createReactiveField` / `@state`. Host members are `State`; tracking is `State.get()`.
- Removed the legacy internal-state and property decorator aliases. Use `@state` and `@prop(...)`.
- SSR boot is `@ecopages/radiant/server/install-ssr-runtime`. Deep imports of `install-ssr-scope-adapters` and `withForcedServerCustomElementRendering` are gone.
- Removed `@ecopages/radiant/core/reactive-jsx-value` and `@ecopages/radiant/tools/render-jsx-template`. `@ecopages/radiant/server/radiant-element-ssr-bridge` is a deprecated alias of `radiant-element-ssr`.
- `render-component` no longer ships fragment HTTP header constants or header-builder helpers.

| Old                                                               | Use instead                                        |
| ----------------------------------------------------------------- | -------------------------------------------------- |
| `install-ssr-scope-adapters`                                      | `@ecopages/radiant/server/install-ssr-runtime`     |
| `bindReactiveValue` / `@ecopages/radiant/core/reactive-jsx-value` | `this.bind(...)` / `this.$.key`                    |
| `@ecopages/radiant/tools/render-jsx-template`                     | `@ecopages/jsx` `render(...)` or `renderComponent` |
| `@ecopages/radiant/server/radiant-element-ssr-bridge` (new code)  | `@ecopages/radiant/server/radiant-element-ssr`     |

### Minor Changes

- [#65](https://github.com/ecopages/radiant/pull/65) [`ba60c0a`](https://github.com/ecopages/radiant/commit/ba60c0a4336d47ede31d6540c4fb15fcc284733a) Thanks [@andeeplus](https://github.com/andeeplus)! - Move SSR ambient render state to Node `AsyncLocalStorage` and keep client bundles free of the JSX server entry. Import `@ecopages/radiant/server/install-ssr-runtime` before rendering hosts outside the browser. Bundlers must resolve a single `@ecopages/*` instance.

- [#60](https://github.com/ecopages/radiant/pull/60) [`017f705`](https://github.com/ecopages/radiant/commit/017f70500dbf86d0e8912e8840f8775a7eada9c4) Thanks [@andeeplus](https://github.com/andeeplus)! - Back reactive host members with `@ecopages/signals` `State`, and wire JSX derived bindings through `computed`. `@ecopages/signals` is a direct dependency. Legacy `@state` / `@prop` register `State` during post-construction. `createReactiveMember`, `registerReactiveMember`, and `getReactiveMember` support advanced host integrations.

- [#226](https://github.com/ecopages/radiant/pull/226) [`a68c13a`](https://github.com/ecopages/radiant/commit/a68c13ad59c80b88d4792fc58eeb76f992de09f8) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `@bindTo` to copy a reactive field onto the host or a `data-ref` / selector descendant without a `render()` tree.

    **@ecopages/radiant**

    - `@bindTo(target)` or `@bindTo(target[])` writes `attr`, `bool`, `prop`, or `text` (optional `invert` / `map`). Omit `ref` and `selector` to patch the host (`this` / `this.element`).
    - Flushes after attribute catch-up and the initial hydrate/update, before `onConnected()`, including on reconnect. Missing nodes and non-reactive fields are skipped.
    - A target with zero or several write kinds, or both `ref` and `selector`, throws when the decorator is applied.
    - Events stay `@onEvent`; procedures and derived state stay `@onUpdated`. Import from `@ecopages/radiant` or `@ecopages/radiant/decorators/bind-to`.

- [#278](https://github.com/ecopages/radiant/pull/278) [`0f56507`](https://github.com/ecopages/radiant/commit/0f565075d056e7dca32ab525be2460c683cff6dd) Thanks [@andeeplus](https://github.com/andeeplus)! - Serialize false-default booleans as HTML presence on SSR and the client. Booleans that default to `true` still emit `"true"` / `"false"` so an explicit false survives upgrade.

- [#287](https://github.com/ecopages/radiant/pull/287) [`86cafb6`](https://github.com/ecopages/radiant/commit/86cafb674cd14daaf43389b8357e7073a53fd056) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `FormAssociatedElement` for custom elements that list on native `FormData`. Import it from `@ecopages/radiant/form-associated-element`; subclasses supply `formValue()` and `restoreFormState()`, and the base owns `name`, `disabled`, fieldset disability, reset, and `setFormValue()`. An explicit `defaultValue: undefined` on `@prop` stays `undefined` instead of falling back to the type default (`0` for `Number`).

- [#278](https://github.com/ecopages/radiant/pull/278) [`98646b9`](https://github.com/ecopages/radiant/commit/98646b99034500d7ccf67e373baf23b615fee7cb) Thanks [@andeeplus](https://github.com/andeeplus)! - Remove shadow render mode: `renderRootMode` and the `scope` option on `@query`, `@onEvent`, `createQuery`, and `createEventListener` are gone. Radiant renders into light DOM only.

- [#168](https://github.com/ecopages/radiant/pull/168) [`0b8bb9e`](https://github.com/ecopages/radiant/commit/0b8bb9ed513f95b557d9f24fcd45cbad5b0a6c76) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `protected onConnected()` on `RadiantElement` for post-catch-up connect work. Override it instead of `connectedCallback` + `queueMicrotask(sync)` so authored attributes and the initial hydrate/update are visible; it runs on every connection.

    **@ecopages/radiant**

    - `onConnected()` fires after first-connect attribute catch-up and, when `render()` is overridden, after the initial hydrate/update. Rebuild work torn down in `disconnectedCallback` here; guard once-only bootstrapping with an explicit flag.
    - This is not `registerConnectedCallback()`, which still runs synchronously at the start of `connectedCallback`.

- [#287](https://github.com/ecopages/radiant/pull/287) [`74cebba`](https://github.com/ecopages/radiant/commit/74cebba03780009d80e9963f7b6882486b9a18a4) Thanks [@andeeplus](https://github.com/andeeplus)! - Harden the update cycle and keep framework plumbing off the public host API.

    - A removed host no longer stays subscribed to a shared `@signal` source, and server rendering no longer adds subscribers to one. Changes made while a host is detached still run `@onUpdated` once when it reconnects.
    - `updateComplete` rejects when an `@onUpdated` callback, render, or `updated()` throws, and the next cycle no longer receives the failed cycle's changes.
    - `update()` runs the update cycle on every host, so hosts without `render()` can flush `@onUpdated` and `updated()` synchronously.
    - Legacy decorators no longer run `@onUpdated` for a `@state` initializer on first connect, matching standard decorators.
    - `RadiantElement` and `RadiantController` no longer expose `notifyUpdate`, `getReactiveBinding` (use `bind`), `registerPostSyncCallback`, `registerUpdatedCallback`, `registerContextProvider`, `registerHydrationBinding`, `getContextProviders`, `getHydrationBindings`, `getSsrContextProviders`, `getSsrHydrationBindings`, `flushPostSyncCallbacks`, or `registerEventEmitter`. Decorators and SSR adapters reach that plumbing through `REACTIVE_HOST`.

- [#278](https://github.com/ecopages/radiant/pull/278) [`8006f98`](https://github.com/ecopages/radiant/commit/8006f98f45dc5559ea928d767b3cc54743f33828) Thanks [@andeeplus](https://github.com/andeeplus)! - Batch `@onUpdated` into one update cycle per host, and keep a property write made before first-connect sync from being replaced by the authored attribute.

    - `@onUpdated` runs once per cycle for the members it watches, before the render commits. `updated(changed)` runs after the commit. `updateComplete` resolves when the cycle finishes, including the first connect render.
    - A property assigned before upgrade, or through its accessor before the connect sync, wins over the authored attribute.

### Patch Changes

- [#198](https://github.com/ecopages/radiant/pull/198) [`9742d57`](https://github.com/ecopages/radiant/commit/9742d57d406d822c149a877ec1c0bed06b13ddc6) Thanks [@andeeplus](https://github.com/andeeplus)! - Stop the SSR light-DOM shim from recursing through `CSS.escape`, and make delegated `subscribeEvent(...)` matching ancestor-aware like `@onEvent`. Client ref selectors use native `CSS.escape`.

- [#244](https://github.com/ecopages/radiant/pull/244) [`60abe6d`](https://github.com/ecopages/radiant/commit/60abe6d3f15b98f6bcab5b0088b8f2e7e2431e6d) Thanks [@andeeplus](https://github.com/andeeplus)! - Warn in dev when a delegated `@onEvent` subscribes to a non-bubbling event.

    **@ecopages/radiant**

    - Delegated `selector` / `ref` listeners attach on the host in the bubble phase, so `focus`, `blur`, `mouseenter`, and `mouseleave` never reach them. Registering one without `options: { capture: true }` now logs a dev warning suggesting the bubbling twin (`focusin`, `focusout`, `mouseover`, `mouseout`).
    - `onEvent` event names now autocomplete bubbling event names while still accepting custom event strings; the union is exported as `DelegatedEventType`.

- [#239](https://github.com/ecopages/radiant/pull/239) [`c551ecf`](https://github.com/ecopages/radiant/commit/c551ecf17aa743055e11f1c4ffc51fc923e9d2bd) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep inherited decorator setup, reactive prop metadata, event subscriptions, and context updates isolated so subclassing and overlapping listeners no longer multiply or skip work.

- [#230](https://github.com/ecopages/radiant/pull/230) [`9f1419b`](https://github.com/ecopages/radiant/commit/9f1419b8c2c80522f67f2e9b1eaf6531f0e8d9b3) Thanks [@andeeplus](https://github.com/andeeplus)! - Reflect the normalized property value when a synchronous update callback changes an assignment.

- [#217](https://github.com/ecopages/radiant/pull/217) [`a960b90`](https://github.com/ecopages/radiant/commit/a960b90220221bf34b792cdd57abb0941f0ee9de) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep an authored `value` through custom-element first-connect. A property assigned before upgrade, or an attribute set before first connect, is no longer replaced by an empty reflected `defaultValue`.

- [#234](https://github.com/ecopages/radiant/pull/234) [`74bc685`](https://github.com/ecopages/radiant/commit/74bc68577bdd5b61a8d9689cbedc774b3bfc4608) Thanks [@andeeplus](https://github.com/andeeplus)! - Add optional `transform` to `@prop` for custom attribute ↔ property conversion, including `fromProperty` normalization on JS writes and omission of reflected attributes when `toAttribute` returns null or an empty string.

- [#294](https://github.com/ecopages/radiant/pull/294) [`6213258`](https://github.com/ecopages/radiant/commit/621325874450fc8892b78f91ec381c94d19e0c01) Thanks [@andeeplus](https://github.com/andeeplus)! - Preserve assigned empty strings and arrays when reflected attributes are omitted, instead of feeding the attribute removal back into the property.

- [#259](https://github.com/ecopages/radiant/pull/259) [`ac0c874`](https://github.com/ecopages/radiant/commit/ac0c87487de99b1239968e015887f9d9a40745d1) Thanks [@andeeplus](https://github.com/andeeplus)! - Flush post-sync callbacks during custom-element SSR so `@bindTo` copies reactive fields onto light-DOM targets before serialization.

- [#259](https://github.com/ecopages/radiant/pull/259) [`5327ee5`](https://github.com/ecopages/radiant/commit/5327ee5e0bda108dbea6591ff1cb962cdb0064cc) Thanks [@andeeplus](https://github.com/andeeplus)! - Stop leftover `</div>` text from appearing next to date fields during SSR. Void inputs no longer serialize as `</input>`, and the HTML tokenizer matches element bounds with a tag-name stack so stray void closing tags do not split ancestor wrappers. Stack walks skip eager `innerHtml` extraction so boundary scans stay linear.

- [#294](https://github.com/ecopages/radiant/pull/294) [`6213258`](https://github.com/ecopages/radiant/commit/621325874450fc8892b78f91ec381c94d19e0c01) Thanks [@andeeplus](https://github.com/andeeplus)! - Stop failed update cycles from running changes or renders that a throwing callback queued, including self-updaters that reach the cycle limit.

- Removing a reflected boolean attribute now sets the property to `false`, not `null`.
- Restored automatic `observedAttributes` registration for `@prop` so attribute ↔ property sync works without a manual `static observedAttributes`.
- Fixed light-DOM slot projection dropping assigned nodes when they move under an inner render wrapper.

- Updated dependencies:
    - `@ecopages/jsx@0.3.0`
    - `@ecopages/signals@0.3.0`

## 0.2.0

### Minor Changes

- [#37](https://github.com/ecopages/radiant/pull/37) [`bf7d904`](https://github.com/ecopages/radiant/commit/bf7d9045b5c0ab06e8c111ff2a97e4ab6a278ab7) Thanks [@andeeplus](https://github.com/andeeplus)! - This update introduce the possibility to use stage 3 decorators. This refactor changed the RadiantElement class to be more concise and organised.

## 0.1.8

### Patch Changes

- [`dd0689c`](https://github.com/ecopages/radiant/commit/dd0689c36181be128d393c37e014396373ffda16) - Added @bound decorator to simplify the binding of methods that runs in untracked events

## 0.1.7

### Patch Changes

- [`1504dff`](https://github.com/ecopages/radiant/commit/1504dffb70da7dfd955faf61ea45f03b2427803b) - - Changed the way hydration on context occurs to follow the best practices for web components. Now the hydration data is not passed anymore as an attribute but using a script tag of type json with a `data-hydration` attribute.
    - Refactored `stringifyAttribute` to `stringifyTyped` for better clarity and flexibility. Updated the function to handle both JSON stringification and type preservation based on generic parameters. Now it is possible to return both the type (for jsx usage on atribute) or a string (i.e. for context hydration)

## 0.1.6

### Patch Changes

- [#31](https://github.com/ecopages/radiant/pull/31) [`1af1051`](https://github.com/ecopages/radiant/commit/1af1051af5f119e92690b3aa6a653075faddbc03) Thanks [@andeeplus](https://github.com/andeeplus)! - - added propertyConfigMap and updatesRegistry to keep a more detailed overview of the element.
    - Removed the prefixed property and just kept the base one to simplify the code in the legacy prop decorator alias
    - Added observedAttributes to keep track of the dom changes happening via setAttribute

## 0.1.5

### Patch Changes

- [#28](https://github.com/ecopages/radiant/pull/28) [`e6e083f`](https://github.com/ecopages/radiant/commit/e6e083fe6cdb0c021bf435f2e312c0d892c4867f) Thanks [@andeeplus](https://github.com/andeeplus)! - Added debounce decorator

- [#27](https://github.com/ecopages/radiant/pull/27) [`33434fd`](https://github.com/ecopages/radiant/commit/33434fd54342e99670c852709dd9546be13f3f71) Thanks [@andeeplus](https://github.com/andeeplus)! - Added the possibility to listen for window and document events using the onEvent decorator

## 0.1.4

### Patch Changes

- [#21](https://github.com/ecopages/radiant/pull/21) [`de834a6`](https://github.com/ecopages/radiant/commit/de834a6692da41f5c671abeb16ddc325367aca7e) Thanks [@andeeplus](https://github.com/andeeplus)! - Improved type control on the legacy prop decorator alias

## 0.1.3

### Patch Changes

- [#19](https://github.com/ecopages/radiant/pull/19) [`023e09c`](https://github.com/ecopages/radiant/commit/023e09c48ef4b8d0a34864c847475abf926baace) Thanks [@andeeplus](https://github.com/andeeplus)! - added defaultValue support to the legacy prop decorator alias and improved attribute readers

## 0.1.2

### Patch Changes

- [#16](https://github.com/ecopages/radiant/pull/16) [`aeff3d8`](https://github.com/ecopages/radiant/commit/aeff3d827f59c326d130926e14c7060304e99852) Thanks [@andeeplus](https://github.com/andeeplus)! - Enhanced the @event decorator to ensure uniqueness of EventEmitter instances per class field by utilizing Symbol for keys, improving event handling isolation and configuration specificity.

## 0.1.1

### Patch Changes

- [#13](https://github.com/ecopages/radiant/pull/13) [`b1f6fe2`](https://github.com/ecopages/radiant/commit/b1f6fe27f61e4451f66dc2e188d5b6dfabc27d73) Thanks [@andeeplus](https://github.com/andeeplus)! - Updated query decorator logic and added playground to test it in a realenvironment, esbuild now can bundle the lib properly

## 0.1.0

### Minor Changes

- [#7](https://github.com/ecopages/radiant/pull/7) [`da5a521`](https://github.com/ecopages/radiant/commit/da5a52132d1fe3bc198d3d654dbf927c4fc676d2) Thanks [@andeeplus](https://github.com/andeeplus)! - This update prepares the package for public release. It includes necessary configurations and optimizations to ensure the package is ready for distribution.
