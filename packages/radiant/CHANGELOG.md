# @ecopages/radiant

## 0.3.0-beta.8

### Patch Changes

- Prepare the next beta release.

- Updated dependencies []:
    - @ecopages/jsx@0.3.0-beta.8
    - @ecopages/signals@0.3.0-beta.8

## 0.3.0-beta.6

### Patch Changes

- Prepare the next beta release.

- Updated dependencies []:
    - @ecopages/signals@0.3.0-beta.6
    - @ecopages/jsx@0.3.0-beta.6

## 0.3.0-beta.5

### Patch Changes

- Prepare the next beta release.

- Updated dependencies []:
    - @ecopages/signals@0.3.0-beta.5
    - @ecopages/jsx@0.3.0-beta.5

## 0.3.0-beta.4

### Patch Changes

- [#65](https://github.com/ecopages/radiant/pull/65) [`ba60c0a`](https://github.com/ecopages/radiant/commit/ba60c0a4336d47ede31d6540c4fb15fcc284733a) Thanks [@andeeplus](https://github.com/andeeplus)! - Move SSR ambient render state to Node `AsyncLocalStorage` and keep client bundles free of the JSX server entry.

    **@ecopages/jsx**

    - `@ecopages/jsx/server` is Node-only and stores active SSR render scope in `AsyncLocalStorage` (no sync / browser fallback stack).
    - Add `getActiveSsrScopeValue` / `withActiveSsrScopeValue` for framework-scoped SSR state on the active render scope.
    - `withForcedServerCustomElementRendering` has been removed; custom-element SSR is handled by the server-render pipeline directly.

    **@ecopages/radiant**

    - Server SSR entries install scope adapters into core so client code never imports `@ecopages/jsx/server`.
    - SSR context provider stack lives on the JSX SSR render scope (symbol-keyed); import `@ecopages/radiant/server/install-ssr-runtime` (or another server SSR entry) before rendering hosts outside the browser.
    - SSR bundlers must resolve a single `@ecopages/*` instance (do not inline duplicate copies); the Vite Nitro playground externalizes these packages and installs the SSR runtime at server boot.

- [#60](https://github.com/ecopages/radiant/pull/60) [`017f705`](https://github.com/ecopages/radiant/commit/017f70500dbf86d0e8912e8840f8775a7eada9c4) Thanks [@andeeplus](https://github.com/andeeplus)! - Back reactive host members with signals `State` and wire jsx derived bindings through signals `computed`.

    **@ecopages/jsx**

    - Add `@ecopages/signals` as a peer dependency.
    - `mapSubscribable` now builds signal-backed derivations with `computed` when the source is a `SignalLike` (pull/push remains for `SubscribableJsxValue` adapters).

    **@ecopages/radiant**

    - Add `@ecopages/signals` as a direct dependency (no longer peer-only).
    - Removed `trackReactiveRead` and `registerReactiveDependencyReader` from `RadiantElement` and `RadiantController`. Host members are now signals-backed; dependency tracking is native via `State.get()`.
    - Legacy `@state` / `@prop` decorators now register member `State` during post-construction (SSR and connect), matching standard decorator timing.
    - Legacy `@prop` SSR staging honors pre-render property assignments while connect-time initialization still prefers explicit `defaultValue` over class field initializers.
    - Added `createReactiveMember`, `registerReactiveMember`, and `getReactiveMember` for advanced host integrations.
    - Removed exported `ReactiveField` metadata type; use `createReactiveField` / `@state` instead.

    Decorator APIs (`@state`, `@prop`, `@attr`, `@onUpdated`, `signal()`, `registerUpdateCallback`) are unchanged.

- Updated dependencies [[`beffbbd`](https://github.com/ecopages/radiant/commit/beffbbdf72b6d8353b687e8015089b6d643b867f), [`ba60c0a`](https://github.com/ecopages/radiant/commit/ba60c0a4336d47ede31d6540c4fb15fcc284733a), [`017f705`](https://github.com/ecopages/radiant/commit/017f70500dbf86d0e8912e8840f8775a7eada9c4)]:
    - @ecopages/jsx@0.3.0-beta.4
    - @ecopages/signals@0.3.0-beta.4

## 0.3.0-beta.3

First beta prerelease of the 0.3.0 line.

## Unreleased

### Patch Changes

- Fixed reflected boolean `@prop` values: removing the attribute now sets the property to `false` (not `null`), so `String(el.open)` stays `"false"` and UI state stays coherent.
- Restored automatic `observedAttributes` registration for `@prop` (lost in the Stage 3 decorator migration) so attribute ↔ property sync works again without manually declaring `static observedAttributes`.
- Fixed light-DOM slot projection dropping assigned nodes when they are moved under an inner render wrapper, which could duplicate slotted content on the next update.

### Breaking Changes

- Removed the legacy internal-state decorator alias. Use `@state` instead (drop-in replacement).
- Removed the legacy property decorator alias. Use `@prop(...)` instead (drop-in replacement).
- Removed the legacy decorator alias subpath exports.
- SSR boot is centralized on `@ecopages/radiant/server/install-ssr-runtime`. Deep imports of `install-ssr-scope-adapters` are removed.
- Removed public exports `@ecopages/radiant/core/reactive-jsx-value` and `@ecopages/radiant/tools/render-jsx-template`.
- `@ecopages/radiant/server/radiant-element-ssr-bridge` remains as a deprecated alias of `radiant-element-ssr` for existing integrators.
- `render-component` no longer ships fragment HTTP header constants or header-builder helpers; map `RenderedComponent` metadata in your adapter.

### Migration

| Old                                                               | Use instead                                         |
| ----------------------------------------------------------------- | --------------------------------------------------- |
| `install-ssr-scope-adapters`                                      | `@ecopages/radiant/server/install-ssr-runtime`      |
| `bindReactiveValue` / `@ecopages/radiant/core/reactive-jsx-value` | `this.bind(...)` / `this.$.key` on `RadiantElement` |
| `@ecopages/radiant/tools/render-jsx-template`                     | `@ecopages/jsx` `render(...)` or `renderComponent`  |
| `@ecopages/radiant/server/radiant-element-ssr-bridge` (new code)  | `@ecopages/radiant/server/radiant-element-ssr`      |

### Features

- Added `scope` option to `@query(...)` and `createQuery(...)`: query light DOM (`'light'`, default), shadow DOM (`'shadow'`), or both (`'both'`).
- Added normalized SSR fragment asset metadata in `@ecopages/radiant/server/render-component`, including transport-friendly asset descriptors for script, preload, and stylesheet dependencies.

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
