# @ecopages/radiant-ui

## 0.6.2

### Patch Changes

- [#801](https://github.com/ecopages/radiant/pull/801) [`ac33075`](https://github.com/ecopages/radiant/commit/ac3307564e51368043973b8f9b6da22ce7a66ee2) Thanks [@andeeplus](https://github.com/andeeplus)! - A select or combobox inside an invalid field now shows the error border, like the input and textarea. `RuiSidebarProvider` with `layout="docs"` also reads its header and body max width from a new `--rui-sidebar-container` variable (default `--container-7xl`), so you can widen the layout without overriding Tailwind's global container token.

## 0.6.1

### Patch Changes

- [#796](https://github.com/ecopages/radiant/pull/796) [`81314a8`](https://github.com/ecopages/radiant/commit/81314a8bac19b1456945c45d475c2f0b0d99e897) Thanks [@andeeplus](https://github.com/andeeplus)! - A Radiant UI control wrapped by a custom field host keeps the host's labelling. A host registered with `registerFieldControl` that paints the field's ARIA onto a nested `rui-select`, `rui-combobox`, `rui-listbox`, `rui-number-field` or `rui-date-field` target no longer loses `aria-labelledby`: `fieldAria` and `fieldAriaBindings` now also set `data-rui-field-managed` on the target they paint, and Radiant UI controls never relabel a field-managed target (a stale `aria-label` beside the painted `aria-labelledby` is dropped). A control whose target no field or field host paints keeps labelling itself.

    Pressing Tab in an open `rui-combobox` or `rui-select` with `selection-mode="multiple"` no longer toggles the active option off: Tab closes the popup and keeps the selection. In a single `rui-select`, Tab now picks the active option even with `should-close-on-select` set to false, as a single `rui-combobox` already did, and the popup closes as focus moves on.

## 0.6.0

### Minor Changes

- [#792](https://github.com/ecopages/radiant/pull/792) [`86a1244`](https://github.com/ecopages/radiant/commit/86a1244b8b296a7fa256df596780335a83e101bc) Thanks [@andeeplus](https://github.com/andeeplus)! - `rui-form` runs one submission at a time per store when it owns submission, `FormStore.errors` is read-only, and `validate()` resolves an outcome.

    **Breaking changes**

    - `FormStateStore.validate()` and the built-in `FormStore.validate(paths?)` resolve `{ outcome: 'passed' | 'invalid' | 'overtaken' }` (the exported `FormStateValidateResult`) instead of a boolean. `passed` emits `rui-submit`, `invalid` emits `rui-invalid` with the store's errors, and `overtaken`, a check a newer write superseded, ends the submission without an event so the user submits again. Callers migrate `if (await store.validate())`, which is now always truthy, to `(await store.validate()).outcome === 'passed'`. Implementers return `{ outcome: valid ? 'passed' : 'invalid' }`. A `FormStore.validate(paths)` run that a newer validation of the same path superseded resolves `overtaken`.
    - `FormStore.validateField(name)` is removed. Use `validate([name])`, which resolves `{ outcome }`.
    - `FormStore.errors` is read-only. Assigning it replaced only the form's own errors, so `store.errors = { ...store.errors }` turned errors added with `setErrors` into permanent ones that survived `setErrors(source, {})`. Write errors with `store.setErrors(source, errors)` and remove them with `setErrors(source, {})` or `clearErrors(path?)`.

    **Fixes**

    - Without a `submitHandler` (the built-in store, or an injected store without one), the form runs one submission at a time per store. A submit while one is validating or awaiting `onSubmit` is ignored, so a double click no longer validates twice or emits `rui-submit` twice. With a `submitHandler`, every submit still calls the handler, which owns its own busy state.
    - A submission ends without `rui-submit`, `rui-invalid` or `onSubmit` when the store resolves `overtaken`, when its store was replaced by `connect` or its disposer before validation settled (it no longer submits the replaced store's values), and when the form is no longer connected when validation settles. A form removed and inserted again in the same task keeps its submission.
    - A native `stepMismatch` fact carries `params.step` as a number on number and range inputs, like `min` and `max`, instead of the attribute text. Other input types keep the text.

## 0.5.0

### Minor Changes

- [#779](https://github.com/ecopages/radiant/pull/779) [`b8a3b7f`](https://github.com/ecopages/radiant/commit/b8a3b7f29656001bfc74c75266e13cf8627f4785) Thanks [@andeeplus](https://github.com/andeeplus)! - `rui-form` can now drive a form state store it did not create, and a host can move focus without a submit.

    **New**

    - `form.connect(store, { formatError, submitHandler, resetHandler })` injects a `FormStateStore<TIssue>` and is the only way to do so. It returns a disposer that returns the form to its own store in the state it was left: its values, errors, touched fields and submitted flag. `connect` infers `TIssue` from the store, so `formatError(issue, { path })` receives the store's whole entry, with no cast. The `formatError` property applies to the form's own store only.
    - The `FormStateStore` contract:
        - `getValue(path)`, `setValue(path, value)` and `blur(path)` take plain arguments; paths are dotted field names.
        - `reportNative(facts)` receives each control's native validity (`NativeValidity`, `{ type, params?, message? }`, with the failing `ValidityState` flag as `type`) keyed by path, `null` for a valid control or one that left the form. The form pushes it right after a user's `setValue`, and through a microtask after a store write, a reset, a rename, a control connecting or one disconnecting (skipped when a live control holds the path, as when rows move). A store binds a fact to the value it holds and never counts a report as a change.
        - `getSnapshot()` returns `{ values, errors, warnings }`, the same object until state changes, and `subscribe(listener)` returns its unsubscribe.
        - `reset()` restores initial values and clears errors, warnings, field state and every fact.
        - `validate()` resolves whether the store holds any error; warnings never count.
    - An injected store owns validation timing, touched and dirty state, defaults and which errors and warnings show. The form keeps control registration, the value bridge, native validity, ARIA, presentation, submit and `FormData`, and ignores `mode`, `revalidate-mode`, field `defaultValue`, `defaultValues`, `resolver` and field `rules`.
    - `submitHandler({ submitNatively })` takes over submit, and `resetHandler()` takes over the native `reset` event (the form then rewrites the controls from the store). The form emits neither `rui-submit` nor `rui-invalid` for a handled submit, and a rejection is reported with `reportError`.
    - `rui-form.sync()` writes the controls the user changed into the store and reports every control's fact. The form calls it before `submitHandler` and before its own validation; call it before validating the store yourself outside submit.
    - `rui-form.focusField(paths)` focuses the first registered field among `paths` in document order, with either store. Fields are found from their registrations, so a `RuiField` subclass under another tag counts; unknown paths are ignored.
    - `rui-form` copies `action` and `method` onto its inner `<form>` whenever they change, so a native submit follows a later change.
    - `snapshot.warnings` and the `RuiFieldWarning` region: a warning never marks the control invalid and never blocks submit.
    - A `required` property on `rui-field` is presentation only (`aria-required`, `fieldContext.required`); a `required` rule still validates with the built-in store.
    - `announceControlConnect` and `RUI_CONTROL_CONNECT_EVENT` (from `@ecopages/radiant-ui/form`): a control host that appears after its field announces itself with a bubbling `rui-control-connect` event, and the field seeds it from the form.
    - `FieldControlAdapter.events` (`'host' | 'members'`, default `'host'`) says who dispatches the value events: the registered host itself, or, for a wrapper or group such as `rui-checkbox`, its member native inputs. `rui-field` writes only for an event whose target is the host (or a member input).
    - `FieldRegistrationHandle` gains `refresh()`, which writes the form's value into the control again and reports its fact, and `FieldRegistration` is exported by name.

    **Breaking changes**

    - The built-in `FormStore` nests values by dotted path: `profile.name` is `values.profile.name`, and `rows.0.title` is `values.rows[0].title`. `getValues()`, `getSnapshot().values`, `rui-submit` values, `defaultValues`, `defaultValuesData`, rule callbacks and resolvers see the nested tree; HTML `name` attributes and the keys of `errors`, `touched` and `dirty` stay dotted. Migrate: read nested values, or keep flat names without dots.
    - `FormContextActions.register` and `FormStore.register` return a handle, `{ rename(name), unregister(), refresh() }`, instead of an unregister function, and `FieldRegistration.element` (the field element) is required. Migrate: `const handle = actions.register(r); handle.unregister()`, and pass the element when you build a registration.
    - `FormContextValue.store` is widened from `FormStore` to `FormStateStore`. Migrate: narrow with `instanceof FormStore` to reach `FormStore`-only members.
    - An entry in an errors record marks its field invalid even when its `message` is missing or empty, and an error from `FormStore.setErrors` replaces the store's own error at that path (the source set most recently wins, no message is borrowed, and the error clears when the user edits the field). Migrate: give every error a message and expect a source error to take precedence.
    - Native `input`, `textarea` and `select` validity (`required`, `type="email"`, `minlength`, `pattern`, ...) now blocks a built-in submit and shows the browser's `validationMessage`; the error `type` is the failing `ValidityState` flag (before, `native`). A `resolver` cannot disable it, and a rule or resolver message replaces its text. Migrate: remove the constraint attributes you do not want enforced.
    - `rui-field` `rules` and `default-value`, and `rui-form` `default-values`, `resolver` and `format-error`, are property-only: they are never read from or written to an attribute. Migrate: pass them with `prop:` bindings, and use `data-default-values` / `data-default-value` for defaults in markup.
    - Radiant UI form controls dispatch the native `input` and `change` events instead of `rui-change`, and the `Rui*ChangeDetail` types for form controls are removed. Migrate: listen for `input`/`change` and read the value from the control instead of `event.detail`. `rui-checkbox`, `rui-switch`, `rui-radio-group` and `rui-checkbox-group` dispatch nothing themselves; the events of their native inputs bubble through. A host registered with `registerFieldControl` must dispatch `input` (and `change` on commit) on itself after updating `value`. Tabs, tree, treegrid, menus, table, calendar and cycle-toggle keep `rui-change`, meaning a non-form component's selection changed, with the value in `detail`.
    - A custom control host must call `announceControlConnect(this)` when it connects: `rui-field` no longer observes its subtree for late controls, and a native `data-rui-control` input, select or textarea must already be inside its field when the field connects. Migrate: call `announceControlConnect` in `connectedCallback`.
    - `FormStore` API: `setValue` is a change (it marks the field dirty, validates per `mode` and clears a `setErrors` error at that path) and no longer takes `shouldDirty`; its name is a string path; `errors` is an accessor, so a subclass that declares it as a property no longer compiles; `errors`, `touched` and `dirty` are string-keyed records; `getValues()` returns `FieldValues`; the resolver is `Resolver` (not `Resolver<T>`); and `handleSubmit`'s `onInvalid` receives an optional second argument, the error a validator threw. Migrate: drop `shouldDirty`, and index records with strings.

    **Fixes**

    - A `rui-field` registers once and keeps that registration across renames and row swaps, instead of unregistering and registering again, which briefly dropped its value.
    - A submission always settles: `FormStore.isSubmitting` stays true until an awaited `onSubmit` finishes and is always cleared, a validator that throws ends the submission with `rui-invalid` (`detail.error` holds the thrown value), and an `onSubmit` rejection is reported with `reportError` instead of becoming an unhandled rejection.
    - A composite control (a checkbox group, a multi-select) is written once per toggle: the field writes on `input`, the `change` that follows carries the same value and is dropped, and an untouched group writes nothing.
    - A range `rui-slider` ignores autofill, which hands it one string that cannot carry both ends, and restores both ends from a saved back/forward state.

### Patch Changes

- [#774](https://github.com/ecopages/radiant/pull/774) [`630f08d`](https://github.com/ecopages/radiant/commit/630f08da261769d09eebedcc569b6fb2825637cb) Thanks [@andeeplus](https://github.com/andeeplus)! - Canvas audio visualizer presets no longer report `ResizeObserver loop completed with undelivered notifications` on `window` when their container resizes: the canvas refits on the next animation frame.

- [#787](https://github.com/ecopages/radiant/pull/787) [`8fa1fdc`](https://github.com/ecopages/radiant/commit/8fa1fdc79ecc2140fd04b155314e449a656d6ec5) Thanks [@andeeplus](https://github.com/andeeplus)! - `rui-slider`, `rui-knob`, `rui-number-field` and `rui-date-input` forward the labels associated with the host (`<label for="host-id">` outside a `rui-field`, or a `<label>` ancestor, through `FormAssociatedElement.labels`) to the `aria-labelledby` of the inner part that holds the role: each slider thumb, the knob control, the number-field text box and the date-input group. A range thumb keeps its own minimum or maximum name beside the label. The hosts add no role or ARIA state of their own. A label added after connect is picked up on the next focus. `rui-knob` also restores its value and dispatches `input` only when a drag is cancelled, as `rui-slider` does.

- [#786](https://github.com/ecopages/radiant/pull/786) [`04f038b`](https://github.com/ecopages/radiant/commit/04f038bd6577ee7baf254980b38cb8557978f932) Thanks [@andeeplus](https://github.com/andeeplus)! - `rui-slider` updates `value` before it dispatches `input` or `change`, on every move. Before, a keyboard step or a drag emitted while `value` still held the previous value, so a `rui-field` wrote that stale value to its form. A cancelled drag restores the value and dispatches `input` only.
- Updated dependencies [[`2a33a2c`](https://github.com/ecopages/radiant/commit/2a33a2c20614c8fd247bb7b4b410cf5a834600b3), [`3bd6c7c`](https://github.com/ecopages/radiant/commit/3bd6c7c8453c04fa3ab60ea3b5ca9ffe12f52d69), [`d99d166`](https://github.com/ecopages/radiant/commit/d99d166c2ba4158b7b941656d4b54843f1cfdc64), [`86c93e6`](https://github.com/ecopages/radiant/commit/86c93e6287d1dd103bdd22baf9e3d4dec3e14be5)]:
    - @ecopages/radiant@0.12.0
    - @ecopages/jsx@0.12.0
    - @ecopages/signals@0.12.0

## 0.4.3

### Patch Changes

- [#765](https://github.com/ecopages/radiant/pull/765) [`cfa48c8`](https://github.com/ecopages/radiant/commit/cfa48c86b25798f7903ef4c8d29800cc9186b5ba) Thanks [@andeeplus](https://github.com/andeeplus)! - Fix `MediaController` reporting `loading` after a host removes the element's `src` and calls `load()`. The status is now `idle` as soon as `emptied` fires, instead of staying `loading` until the next media event, and `play()` does nothing while the element is emptied, as it already did for an element that never had a source.

- [#757](https://github.com/ecopages/radiant/pull/757) [`c83ae91`](https://github.com/ecopages/radiant/commit/c83ae91fdcce6561cf60a32e65a97f19e961a519) Thanks [@andeeplus](https://github.com/andeeplus)! - Read catalog parts with `@ref`, `@refAll`, `@query(selector)` and `@queryAll(selector)` instead of the `@query` options object. Public types are unchanged; the one behavior change is that a host no longer reads a nested catalog host's same-named `data-ref` part.

- [#753](https://github.com/ecopages/radiant/pull/753) [`cb88ca7`](https://github.com/ecopages/radiant/commit/cb88ca794a793c9823157c9a00d359a38f6f1c73) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `PortalController.mountedNode`, the node it holds out right now. `PopoverController.getFloatingElement()` now returns the element `getFloating` finds or, while the popup is portaled and the owner cannot find it, the portal's mounted node, including during the exit transition. It no longer remembers the last element it saw, so a popup the owner replaced is never returned stale.

    `select`, `combobox`, `date-field` and `date-range-picker` find their popup while it is portaled and during its exit transition, `rui-popover` reads its surface the same way, and `rui-hover-card` keeps `aria-label` on its content in sync with `content-label` while the content is portaled.

- [`ca16ce5`](https://github.com/ecopages/radiant/commit/ca16ce5faabc45aa6b6cf8214fac80a3aa81b61c) Thanks [@andeeplus](https://github.com/andeeplus)! - `RuiButton` accepts a signal or `this.$` binding for `pressed`, so a toggle button's `aria-pressed` updates without re-rendering the host.

- [#756](https://github.com/ecopages/radiant/pull/756) [`8de8063`](https://github.com/ecopages/radiant/commit/8de806399291a8d4a85e3ce24157530fc703ccd4) Thanks [@andeeplus](https://github.com/andeeplus)! - Stop `rui-toast` writing a stray `ref="toast"` attribute; its `data-ref="toast"` part is unchanged. `ref` is now a reserved JSX callback prop.
- Updated dependencies [[`2d092aa`](https://github.com/ecopages/radiant/commit/2d092aac6f1989b620f06eab190b23e9a4a6c879), [`9080482`](https://github.com/ecopages/radiant/commit/9080482028469c43f82fe63819c0ca338e65d35b), [`64b9315`](https://github.com/ecopages/radiant/commit/64b9315dc4096c30fe850969abc3fbf8b0391678), [`a7f7fb6`](https://github.com/ecopages/radiant/commit/a7f7fb628f59c25a89b122468a5d86027022ef41), [`2d9d28a`](https://github.com/ecopages/radiant/commit/2d9d28a5296c4f86b7ff213f491687bba495c8e1), [`60da1ef`](https://github.com/ecopages/radiant/commit/60da1effde883d93033af1bcee38290cef983cd3), [`59f2b21`](https://github.com/ecopages/radiant/commit/59f2b21fe77e9404652635741559a0f10b3e8dad), [`c13d35b`](https://github.com/ecopages/radiant/commit/c13d35bd0e0d58060b680d59b59101e8052d29c4), [`655ad1a`](https://github.com/ecopages/radiant/commit/655ad1aebda2fe164bc84684b108eb96125e0051), [`8de8063`](https://github.com/ecopages/radiant/commit/8de806399291a8d4a85e3ce24157530fc703ccd4), [`0af1fcc`](https://github.com/ecopages/radiant/commit/0af1fccd55ea9773a05e73b50dea11d1305395da), [`12dccc4`](https://github.com/ecopages/radiant/commit/12dccc43210a4dee3ec1ae20001217f63c2bdcfb), [`01c1ecb`](https://github.com/ecopages/radiant/commit/01c1ecb3c1ea528991bb0158129034e43ef89e9a), [`7666b07`](https://github.com/ecopages/radiant/commit/7666b073437358215cd78ee962e79e5ffb982452), [`6e7265e`](https://github.com/ecopages/radiant/commit/6e7265edd7b260060cef5e948bd6dfd47778ee0b), [`9bce50d`](https://github.com/ecopages/radiant/commit/9bce50d1567b72b3846b147a2323e10843f5ec53), [`b198656`](https://github.com/ecopages/radiant/commit/b1986564e87f860ccf7509074ab0033779d3f8b8), [`53aac76`](https://github.com/ecopages/radiant/commit/53aac76223862a7845c24e2a11394154888318f3), [`c7add52`](https://github.com/ecopages/radiant/commit/c7add526084e4533b4dd34f14bf63ef9119e8eaf)]:
    - @ecopages/radiant@0.11.0
    - @ecopages/signals@0.11.0
    - @ecopages/jsx@0.11.0

## 0.4.2

### Patch Changes

- [#719](https://github.com/ecopages/radiant/pull/719) [`85393df`](https://github.com/ecopages/radiant/commit/85393df25720fb32e8ecf8c5eff7d2f7bcf084a0) Thanks [@andeeplus](https://github.com/andeeplus)! - The `bars` preset can now leave gaps inside the sound. New options shape a band's level: `floorLevel` (the analyser level at or below which a band is off), `range`, `curve` and `adapt` (scale against a decaying running maximum); the defaults keep the level as it was. Two defaults change for segmented canvas bars (`segments`): they no longer apply `floor` while playing, so a band that is off lights no segment, where it used to light at least two of 14, and a peak cap is not drawn on an empty bar. `idle: 'floor'` now rests segmented bars as one dim lowest segment instead of the `floor` height.

    The canvas bars also take a `variant`: `led` (the default when `segments` is set), `solid` (rounded tops), `line` (hairlines, with `lineWidth`) and `mirror` (grows up and down from the middle). They share the level shaping, have no minimum height, and rest as nothing or one dim hairline with `idle: 'floor'`; without `variant` the bars look as before.

- [#715](https://github.com/ecopages/radiant/pull/715) [`36e3bdc`](https://github.com/ecopages/radiant/commit/36e3bdc5b505583079ef5a6499de542c690484bc) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `AudioVisualizerController` and `createAudioVisualizerController` to `@ecopages/radiant-ui/controllers`, with the `bars` (DOM `--level` or canvas) and `wave` presets, the `AudioVisualizerPreset`, `AudioFrame`, `BarsOptions` and `WaveOptions` types, and the preset utilities `logBands`, `bandPeak` and `createCanvasSurface` for writing your own. The controller runs one frame loop while an audio or video element plays and reads the sound through an analyser of its own. The first time an element is visualized its sound is routed through one shared `AudioContext` straight to the speakers, and that cannot be undone, so a visualized element must keep same-origin or CORS-enabled sources (redirects included) for its whole life: a later cross-origin source without `crossorigin` is silent and reported as the `opaque` state, and a context the browser suspends or interrupts silences the media until it runs again. The controller stays idle when the browser has not allowed the audio context to start, reports `opaque` while the media plays a cross-origin source without `crossorigin` (and builds no graph), stays at rest under `prefers-reduced-motion`, and swaps presets at runtime with `setPreset`. `refresh()` re-evaluates the getters and `getEnabled`, and `resume()` starts the context from a click or key handler (not verified on iOS or WebKit). The canvas `bars` preset takes `padding`, `segments`, `segmentGap`, `ends`, `colorEnd`, `peaks: { hold, fall }` and `idle: 'floor'` (LED-style bars with peak caps that keep drawing at rest, so they show under reduced motion), `wave` takes `padding`, `createCanvasSurface` takes an `onResize` callback, and `stepPeak`, `litSegments` and `segmentBounds` are exported for presets you write. `onState` is called on each change of `getState()`, never per frame. `getStream` visualizes a `MediaStream` instead of an element (exactly one of `getMedia` and `getStream`): its source goes to the analyser only, never to the speakers, its tracks are never stopped, it is idle while the stream has no live audio track, and `refresh()` picks up a new or `null` stream.

- [#711](https://github.com/ecopages/radiant/pull/711) [`2602ae3`](https://github.com/ecopages/radiant/commit/2602ae35c5de42673c1842582d988526835afc64) Thanks [@andeeplus](https://github.com/andeeplus)! - Stop an icon inside a `RuiButton` from shrinking when the button is too narrow for its label.

- [#719](https://github.com/ecopages/radiant/pull/719) [`85393df`](https://github.com/ecopages/radiant/commit/85393df25720fb32e8ecf8c5eff7d2f7bcf084a0) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `CaptionsController` and `createCaptionsController` to `@ecopages/radiant-ui/controllers`: captions and subtitles for a media element from cue data, WebVTT text or a URL, one track shown at a time, drawn by the browser (kept above a controls element) or written as text into an overlay element.

- [#727](https://github.com/ecopages/radiant/pull/727) [`1b7401f`](https://github.com/ecopages/radiant/commit/1b7401ff416625a68cbe645bd928eebf960d622d) Thanks [@andeeplus](https://github.com/andeeplus)! - `CaptionsController` accepts a `getMedia` that returns `null` while the media element is not rendered yet. `attach()` does nothing then, the state reports no tracks, and a later `refresh()` or `attach()` picks the element up.

- [#712](https://github.com/ecopages/radiant/pull/712) [`5142f11`](https://github.com/ecopages/radiant/commit/5142f118c96bca1858686bce025d3f38476d6384) Thanks [@andeeplus](https://github.com/andeeplus)! - Fix accessibility defects in the behavioural controllers.

    - Escape: `DismissController` sends it to one layer per key press, the top-most nested open one first, and ignores it while an input method is composing. An Escape whose default a handler already prevented reaches no layer. `onDismiss` may return `false` for an Escape it did not act on, and the key then goes to the next layer; any other return value counts as handled. A closed `rui-select` or `rui-combobox` no longer prevents Escape, so an enclosing dialog or popover still closes; `rui-combobox` prevents it only when it clears its text. A window blur or tab switch is no longer treated as focus leaving.
    - Modifier keys: `RovingController` and `MenuTreeController` leave Alt, Ctrl and Meta keys to the browser.
    - Roving and text fields: `RovingController` leaves keys typed in a text field that is not an item alone (a textarea, a contenteditable element, or an input of type text, search, email, url, tel, password, number or a date type). Checkboxes, radios, buttons, ranges and selects nested in an item stay navigable. `isRovingKeyIgnored` is exported.
    - Focus loop: `FocusTrapController`, and `rui-dialog` with it, loops over visible, enabled, non-inert focusable elements only, skipping `[hidden]`, `[inert]`, `visibility: hidden` and controls disabled by a `<fieldset disabled>` ancestor. `getFocusableElements` relies on `checkVisibility`. `queryFocusableCandidates` and `findFirstFocusableCandidate` now also match `summary`, `[contenteditable]`, `audio` and `video` with `controls`, and `iframe`, and skip `input[type=hidden]` and `contenteditable="false"`; `rui-tooltip` and `rui-hover-card` use them to find their trigger and first focusable, so they can resolve a different element than before.
    - Menus: `MenuTreeController` closes only the focused submenu on Escape, supports `menuitemcheckbox` and `menuitemradio`, including inside a `role="group"`, and lets only a `menuitem` own a submenu.
    - Option ids: `setCollectionActive` gives options unique ids from `uniqueId(idPrefix)` instead of `${idPrefix}-${index}`, so code or tests that look an option up by `prefix-0` need updating.
    - Sortable: `SortableController` cancels a pointer drag on Escape and adds `move` and `moveBy` for a non-drag alternative. `SortableSource` gains `'programmatic'`, so an exhaustive `switch` over it needs a new case.

    The controller docs list what each controller does and what the component must provide.

    Popups inside a dialog.

    - `PopoverController` portals into the nearest `[aria-modal="true"]` ancestor of the anchor when no `getPortalContainer` is given or it returns `null` (an open modal `<dialog>` counts too), so `rui-popover` and `rui-hover-card` opened inside a `rui-dialog` render above it instead of below its z-index.
    - A click on the `rui-dialog` backdrop that closes a popup inside it no longer also closes the dialog.
    - `rui-popover` sets `aria-haspopup="dialog"` on its trigger.
    - `rui-tooltip` closes on Escape through `DismissController`, so inside a dialog the first Escape hides the tooltip and the second closes the dialog.
    - `rui-menu-button` also closes when focus leaves it, so a menu does not stay open in a dialog that closed.

    Consumer-visible effects of a popup that portals into a modal surface instead of `document.body`: it inherits the surface's text color, font and alignment, selectors such as `.my-dialog button` now reach its content, its items join the dialog's Tab order at the end of the surface, and code that looks for the popup under `body` will not find it. Floating positions are corrected for an ancestor that is a containing block for fixed elements (`transform`, `filter`, `contain`), and recomputed when a transition ends on one. `rui-menu-button` sets `tabindex="-1"` on its menu so a press on a separator, padding or disabled item keeps focus inside. `rui-popover` removes the `aria-*` it set on its anchor when it disconnects or the anchor changes, and keeps an `aria-haspopup` the anchor already has.

- [#716](https://github.com/ecopages/radiant/pull/716) [`d5aa006`](https://github.com/ecopages/radiant/commit/d5aa0061c7ac8f4eaa2a37bce825c045b3860f3e) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `CopyController` and `MediaRecorderController` to `@ecopages/radiant-ui/controllers`. `createCopyController` copies text to the clipboard on a click and reports `idle`, `copied` or `error` as `data-copy-state`, with an announcement callback. `createMediaRecorderController` records the microphone or camera with permission states, pause, a time limit, a result URL it revokes and a stream other controllers can read.

- [#728](https://github.com/ecopages/radiant/pull/728) [`3d6503d`](https://github.com/ecopages/radiant/commit/3d6503d0761d68b6503fbb74a88c20188f58c632) Thanks [@andeeplus](https://github.com/andeeplus)! - `RuiDialogClose` with children renders a normal in-flow ghost `RuiButton` instead of the absolutely positioned corner button, so `<RuiDialogClose>Cancel</RuiDialogClose>` sits in a `RuiDialogActions` row. Without children it is still the corner icon button.

- [#743](https://github.com/ecopages/radiant/pull/743) [`52cb1bf`](https://github.com/ecopages/radiant/commit/52cb1bf7a7b8daf56c9ce45300ca28edc0af59bb) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `HotkeyController` and `createHotkeyController` to `@ecopages/radiant-ui/controllers`: a handler per key string such as `mod+k`, `shift+ArrowLeft` or `Space` on a target, skipping text fields, composing and keys another handler already prevented, with an optional capture phase.

- [#714](https://github.com/ecopages/radiant/pull/714) [`9a17b23`](https://github.com/ecopages/radiant/commit/9a17b23349654f62e6979f2f7df01772bd7532ae) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `MediaController` and `createMediaController` to `@ecopages/radiant-ui/controllers`, with the `MediaState`, `MediaStatus`, `MediaControllerConfig` and `MediaLoadOptions` types: the playback core of an `HTMLAudioElement` or `HTMLVideoElement`, so a player with custom controls never listens to a media event. It reports one state snapshot derived from the element (`idle`, `loading`, `ready`, `playing`, `paused`, `ended` or `error`, with position, duration, buffered ranges, seekable window, `currentSrc`, volume, rate, `waiting`, `seeking`, `live` and `blocked`), calls `onProgress` once per animation frame while playing, and offers `load` (with `autoplay` and `startAt`), `retry`, `play`, `pause`, `toggle`, `seek`, a debounced `scrub`, `skip`, `goLive` and the volume, mute, rate and loop setters. `play()` never returns a promise that does not settle on an element with no source, treats an interrupted play as quiet and an autoplay refusal as `blocked`, and does nothing after a rejected `resolveSource` until `load()` or `retry()` (`seekable` is `false` meanwhile). An optional `resolveSource` hook loads through a Blob for servers without range requests, with `releaseSource` to revoke it, and a newer `load()` or a `destroy()` discards a stale resolution. `destroy()`, and `attach()` to another element, pause and release in a microtask and only when no controller is attached to the element any more, so a DOM move keeps playing; the resolved source is released once, by the last controller, and only with `clearSourceOnDestroy`: otherwise the element keeps `src` and the next `load()` releases it.

    Add `formatMediaTime`, `clampSeek` and `bufferedEnd`, with the `FormatMediaTimeOptions` and `TimeRangesLike` types, to `@ecopages/radiant-ui/helpers`.

- [#723](https://github.com/ecopages/radiant/pull/723) [`1943a69`](https://github.com/ecopages/radiant/commit/1943a6971a0fbc195c0bc67a6600782d9a66b43e) Thanks [@andeeplus](https://github.com/andeeplus)! - Fix the number field's value and steppers sitting off the center line, most visibly in a field that is sized smaller than the default control. The group now owns the control height and the input fills it, so a caller that sets the group's height no longer clips an input that insisted on its own taller minimum. The increment and decrement steppers now draw a plus and a minus icon (`RuiIconPlus` and `RuiIconMinus`, also exported from `@ecopages/radiant-ui/icons`) instead of the text characters `+` and `-`, whose vertical position followed the font's metrics. A stepper that is given its own children is unchanged.

- [#738](https://github.com/ecopages/radiant/pull/738) [`d787d54`](https://github.com/ecopages/radiant/commit/d787d54d9dd244280f6b2123cf57a1d2c54bacbd) Thanks [@andeeplus](https://github.com/andeeplus)! - Published type declarations now use explicit file extensions on relative imports, so TypeScript projects on `moduleResolution` `node16` or `nodenext` resolve the packages' types.

- [#722](https://github.com/ecopages/radiant/pull/722) [`b9c3d9c`](https://github.com/ecopages/radiant/commit/b9c3d9c9c0c3bd4e9e1f32f27d8680afa115fdba) Thanks [@andeeplus](https://github.com/andeeplus)! - Animate the `rui-sidebar` mobile drawer. The pane now keeps a fixed width and slides in from its edge with `transform` (300ms decelerating in, 200ms accelerating out, from `--duration-slow`, `--duration-normal`, `--ease-out` and the new `--ease-in` token) instead of animating its width, and the scrim fades with it. The drawer stays visible until the slide-out ends, with pointer events off and the pane `inert` from the moment it closes, and a toggle mid-transition reverses from the current position. Under `prefers-reduced-motion` the pane and scrim cross-fade instead of sliding, and nothing animates on first paint or when the viewport crosses the breakpoint. The scrim is no longer toggled with the `hidden` attribute (custom `data-ref="scrim"` markup should drop `hidden`; CSS shows it only on mobile), and the mobile pane keeps `box-shadow` in both states (the closed drawer is `visibility: hidden`), so a `sidebar.docs.css`-style override should target the pane without a `data-state` selector. Style the timing through `--rui-sidebar-enter` and `--rui-sidebar-exit`.

- [#743](https://github.com/ecopages/radiant/pull/743) [`52cb1bf`](https://github.com/ecopages/radiant/commit/52cb1bf7a7b8daf56c9ce45300ca28edc0af59bb) Thanks [@andeeplus](https://github.com/andeeplus)! - Fix `rui-slider` so a key pressed with Alt, Ctrl or Meta, such as Alt+ArrowLeft for browser Back, no longer moves the thumb and is no longer prevented.

- [#711](https://github.com/ecopages/radiant/pull/711) [`2602ae3`](https://github.com/ecopages/radiant/commit/2602ae35c5de42673c1842582d988526835afc64) Thanks [@andeeplus](https://github.com/andeeplus)! - Make `RuiToolbar` scroll horizontally, with its scrollbar hidden, instead of overflowing its container when its controls do not fit. Its children keep their width rather than shrinking.
- Updated dependencies [[`a5aca39`](https://github.com/ecopages/radiant/commit/a5aca39abf138870d9642d7b1996d5c2fca643d1), [`075da44`](https://github.com/ecopages/radiant/commit/075da444e9d2d903b2100f99cc294c27cc0e5d1b), [`d787d54`](https://github.com/ecopages/radiant/commit/d787d54d9dd244280f6b2123cf57a1d2c54bacbd), [`4bfd993`](https://github.com/ecopages/radiant/commit/4bfd993d735b3f29aeb4fe37840ba01a174954b0), [`cb85c93`](https://github.com/ecopages/radiant/commit/cb85c93eac1732f30f82c4b5cb83d56e187bb8a0), [`ed3c7f0`](https://github.com/ecopages/radiant/commit/ed3c7f0f2718ae26cf32403333a0bf129587ed32), [`c8239ff`](https://github.com/ecopages/radiant/commit/c8239ff1b73b5fa740b8cdf6479c3af6259a71ab), [`175124f`](https://github.com/ecopages/radiant/commit/175124f3c59a0cb12caa0f35d9d4ae5b9588aa79), [`1052bcc`](https://github.com/ecopages/radiant/commit/1052bcc9312db7490ee264f5ca303a4c6912044a), [`45d2dbb`](https://github.com/ecopages/radiant/commit/45d2dbbad4e2c4c7028afd74d4edfac7e03df8a4)]:
    - @ecopages/jsx@0.10.0
    - @ecopages/radiant@0.10.0
    - @ecopages/signals@0.10.0

## 0.4.1

### Patch Changes

- [#706](https://github.com/ecopages/radiant/pull/706) [`f84a117`](https://github.com/ecopages/radiant/commit/f84a117a63433195b8cadf84931763bdc54caf8d) Thanks [@andeeplus](https://github.com/andeeplus)! - Follow-ups to the reusable controllers.

    `SwipeController` takes `minVelocity` and `dominance`, so a short fast flick counts and a diagonal drag does not, and `PointerDragController` reports `elapsedMs`. `FocusTrapController` takes `getEnabled` and `getReturnFocus` and has `focusFirst()` and `focusLast()`. `SortableController` has an opt-in `preview` that lifts the item out of its container to follow the pointer, with a placeholder that marks where it will land. `ScrollLockController` takes a `getTarget`, so an app shell with an inner scroll container can lock it.

    Select, combobox, date-field and date-range-picker gain a `portal` option, off by default, and every portal-capable popup (those four, `rui-popover` and `rui-hover-card`) gains `portalContainer`, a selector, element or function resolved when the popup opens.

    A portaled popup inside a popover no longer closes it: a node moved by `PortalController` counts as inside the surface it came from.

- [#699](https://github.com/ecopages/radiant/pull/699) [`2067d66`](https://github.com/ecopages/radiant/commit/2067d66fbbd499fd01df451754908ba9b63f8551) Thanks [@andeeplus](https://github.com/andeeplus)! - `parseNumber` now returns `null` for text that is not a number, such as `abc` or `12abc`, instead of dropping the stray characters and returning `0` or `12`. It ignores only the group separator, currency, percent sign, unit and spaces the formatter itself writes, and reads the locale's own minus sign, so formatted values still parse back. `rui-number-field` keeps its committed value when the typed text is not a number.

- [#697](https://github.com/ecopages/radiant/pull/697) [`a7be74d`](https://github.com/ecopages/radiant/commit/a7be74d61238c256db4b740ddb75141d5ab1704a) Thanks [@andeeplus](https://github.com/andeeplus)! - Add the `@ecopages/radiant-ui/controllers` and `@ecopages/radiant-ui/helpers` entries, the reusable logic Radiant UI components are built from.

    Controllers attach to a host and tear down with it, each with a `createX(host, config)` factory: event listeners, mutation and resize observation, dismissal, popover, portal, focus trap, scroll lock, roving tabindex, swipe, pointer drag, sortable (with drag between containers), and menu tree controllers. Main controllers expose `protected` hooks at their decision points. `SwipeController` is built on `PointerDragController` and reports a release outside the element.

    Helpers are the pure logic behind them: date, selection and segment logic, masks, number formatting, parsing and numeric ranges, text filtering, `cycleValue`, `uniqueId` and `isCssSafeId`, ordering and floating-position decisions.

    `rui-tag-group` gains an opt-in `reorderable` attribute and a `rui-reorder` event; Space lifts a tag instead of selecting it. The carousel flips its swipe direction in right-to-left layouts, `rui-dialog` releases its scroll lock and returns focus when it disconnects while open, and pointer drags ignore a non-primary button.

## 0.4.0

### Minor Changes

- [#675](https://github.com/ecopages/radiant/pull/675) [`4d1137b`](https://github.com/ecopages/radiant/commit/4d1137bbffca86cc36c4f547acda200b0e164941) Thanks [@andeeplus](https://github.com/andeeplus)! - `rui-form` now validates against a form-associated control's own validity. A host that calls `ElementInternals.setValidity` blocks submission and shows its message in the field's error region; a rule or resolver message wins. `FormAssociatedElement` exposes `validity` and `validationMessage`, and `registerFieldControl` accepts an optional `validity` reader. A subclass that already declares its own `validity` or `validationMessage` member must rename it or match the new getter types.

### Patch Changes

- Updated dependencies [[`4d1137b`](https://github.com/ecopages/radiant/commit/4d1137bbffca86cc36c4f547acda200b0e164941)]:
    - @ecopages/radiant@0.9.0
    - @ecopages/jsx@0.9.0
    - @ecopages/signals@0.9.0

## 0.3.6

### Patch Changes

- [#666](https://github.com/ecopages/radiant/pull/666) [`81c44f7`](https://github.com/ecopages/radiant/commit/81c44f70bd8ed8b8c195fe8f4ad782e966dd1205) Thanks [@andeeplus](https://github.com/andeeplus)! - `RuiNumberField` shows an empty field as empty instead of `0`, with no `aria-valuenow` and an empty form value, and commits a typed `0` by setting `value` and emitting `rui-change`. Stepping from empty still starts at `0` or `defaultValue`.

## 0.3.5

### Patch Changes

- [#664](https://github.com/ecopages/radiant/pull/664) [`201fd64`](https://github.com/ecopages/radiant/commit/201fd649b8ca672e44830dfb1e289f4effa1e88d) Thanks [@andeeplus](https://github.com/andeeplus)! - A custom control host now paints its own field ARIA, and `RuiFieldError` can show an error that does not belong to a control.

    - `RuiField` no longer writes `id`, `data-rui-field-managed` or `aria-*` onto a host registered with `registerFieldControl` that declares `data-rui-aria-target(s)`. It publishes `labelId`, `describedBy` and `disabled` on `fieldContext` (new fields on `FieldContextValue`), and the host binds them declaratively from `@ecopages/radiant-ui/field`: `{...fieldAria(this.field)}` on the target in a `render()` tree, or `@bindTo(fieldAriaBindings('input'))` on the `@contextSelector` field for authored DOM. A target that renders after the field connected is now labelled, and a host that never rendered its target stays free of ARIA. Catalog hosts and native inputs are unchanged. A third-party host that relied on the field's writes must bind the context; the bound attributes include the target `id` that the label's `htmlFor` points at.
    - Migration for a third-party host that paints its own ARIA: the field no longer sets native `disabled` on its target, so bind it yourself (for example `<input disabled={this.field?.disabled} {...fieldAria(this.field)} />`). Painted hosts support a single ARIA target, because `fieldAria` and `fieldAriaBindings` yield one `id`; a host with several targets (`data-rui-aria-targets`) must assign its own ids.
    - `RuiFieldError` takes an `error` prop (with `children` as the fallback). It renders that content, is visible while non-empty, works outside `RuiField` and on the server, and carries `data-rui-field-error-controlled` so the enclosing field neither overwrites nor hides it.

    `@ecopages/radiant-ui` requires `@ecopages/jsx`, `@ecopages/radiant` and `@ecopages/signals` 0.8.3 or later: the `fieldAria()` spread adds and drops attributes, and only that release keeps the element when bound attributes change ([#659](https://github.com/ecopages/radiant/issues/659), [#660](https://github.com/ecopages/radiant/issues/660)). The peer ranges are raised to `>=0.8.3`.

- Updated dependencies [[`8633356`](https://github.com/ecopages/radiant/commit/863335695b59e88742fa941f565a311f6bb0c48f), [`16efb9e`](https://github.com/ecopages/radiant/commit/16efb9eb8242d870a13ca9fa1f48439e12de3eaf), [`b62a0e2`](https://github.com/ecopages/radiant/commit/b62a0e21e37e2be179fc71b911ba134445df75b3), [`1a6902d`](https://github.com/ecopages/radiant/commit/1a6902dc7d4012747c05b6e30c0c53b219d9163b)]:
    - @ecopages/radiant@0.8.3
    - @ecopages/jsx@0.8.3
    - @ecopages/signals@0.8.3

## 0.3.4

### Patch Changes

- [#647](https://github.com/ecopages/radiant/pull/647) [`5f154a0`](https://github.com/ecopages/radiant/commit/5f154a07abb3570e8f31f519b9c6f5c4b52c3155) Thanks [@andeeplus](https://github.com/andeeplus)! - Stop repeating `@utility` output once per component in the built `styles.css`. `styles.css` shrinks from 241,873 B to 202,740 B (about 16%) and each `.rui-button--*` rule carries one `background-image: none` instead of 61.

    In forced-colors mode the sheen is now removed as `sheen.css` intends; the old output let the `background-image` declaration override the `none` override.

## 0.3.3

### Patch Changes

- [#637](https://github.com/ecopages/radiant/pull/637) [`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889) Thanks [@andeeplus](https://github.com/andeeplus)! - Buttons now move down by `--press-shift` (1px) while pressed, the small nudge shadcn uses, using a new `--ease-out-strong` curve, and the button transition drops from 300ms to `--duration-fast` and animates only color, shadow and transform. The icon toggle and clear buttons press the same way. Button hover styling applies only on devices that support hover, and `prefers-reduced-motion` disables the movement. The Windows 95, Mac OS Classic and macOS themes set `--press-shift: 0px` so their controls do not move.

- [#637](https://github.com/ecopages/radiant/pull/637) [`367d225`](https://github.com/ecopages/radiant/commit/367d225ef217a645ab262edbe8f56703f5c032c2) Thanks [@andeeplus](https://github.com/andeeplus)! - The date field, date range picker and number field take their font size from `--text-control-input` and inherit the line height instead of applying `text-sm`, so their text sits on the same 21px line as the text input and the date input, and follows the larger mobile input size.

- [#637](https://github.com/ecopages/radiant/pull/637) [`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889) Thanks [@andeeplus](https://github.com/andeeplus)! - Radiant Default is close to the Zed theme's density, one step larger on the controls: 28, 32, and 36px controls (was 32, 40, and 48px), 14px control text, 10px by 4px control padding, and the 4px-base spacing scale, so control rows are compact inside evenly spaced layouts while hit areas stay well above the 24px WCAG 2.2 minimum. `--rui-density` still scales the sizes and the spacing together. The Vercel theme is also one size step smaller: 28, 32, and 40px controls with 13px control text and trimmed menu, tab, and tooltip padding; its colors, borders, and radii are unchanged.

    The `@ecopages/radiant-ui/tokens/spacing/comfortable` pack keeps the earlier 32/40/48px controls, and every other complete theme in `@ecopages/radiant-themes` imports it, so their sizes do not change. Import it after `themes/default` to restore the earlier Radiant Default density. The `compact` and `wide` packs are unchanged.

- [#637](https://github.com/ecopages/radiant/pull/637) [`e8bb10e`](https://github.com/ecopages/radiant/commit/e8bb10ec1dd3b4d9e63fde96128d34f71287df13) Thanks [@andeeplus](https://github.com/andeeplus)! - Filled and destructive buttons use a border in their own fill color, including their hover, active and pressed states, instead of a transparent one. At fractional zoom or display scaling the transparent border let the fill end a pixel or two short and soft next to an outline button, which looked like a height difference; the border now snaps to whole device pixels like the outline button's.

- [#637](https://github.com/ecopages/radiant/pull/637) [`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889) Thanks [@andeeplus](https://github.com/andeeplus)! - Composite controls (combobox, select, number field, date input, date field, date range picker, autocomplete and input group) now share `--size-control-md` with the text input. Their inner fields no longer add vertical padding on top of the minimum height, and the combobox, select and date field toggle buttons follow `--size-control-sm` instead of a fixed 2rem, so a theme with compact controls no longer renders them taller than a text input.

- [#637](https://github.com/ecopages/radiant/pull/637) [`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889) Thanks [@andeeplus](https://github.com/andeeplus)! - Popups, dialogs and value changes now animate with short, origin-aware motion. Floating popups (select, combobox, menus, popover, date pickers) fade and scale in from the side facing their anchor and leave faster than they arrive; tooltips fade; hover cards and the dialog surface scale in, and the dialog backdrop fades. The toast stack uses `--duration-slow` and `--ease-out-strong` instead of 400ms. The meter fill, slider range fill and thumb, and knob arc ease between values (sliders and knobs skip the transition while dragging through a new `data-dragging` attribute), checkbox and radio marks scale in, and disclosure, tree and treegrid chevrons share the strong ease-out. New `--popup-*`, `--tooltip-duration`, `--hover-card-enter-duration`, `--dialog-*`, `--backdrop-duration` and `--check-duration` tokens tune or disable it, `prefers-reduced-motion` removes the movement, and `PopoverController` keeps a portaled surface mounted until its exit finishes. The Windows 95 and Mac OS Classic themes set these durations to `0ms` so popups appear instantly.

- [#637](https://github.com/ecopages/radiant/pull/637) [`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889) Thanks [@andeeplus](https://github.com/andeeplus)! - Radiant Default's defaults change: `--rui-radius-scale` is 0.7, `--rui-border-alpha` is 11%, and the neutral seed now reads a new `--rui-neutral-tint` multiplier (default 1.3) that scales the grey chroma, so the greys carry a visible hint of the neutral hue. The docs tuner offers border opacity from 0 to 100%.

    Check boxes and radios take their size from `--rui-choice-size` (default `1rem`, so every other theme is unchanged); Radiant Default sets it from `--size-control-sm`, so they follow `--rui-density`. Their keyboard focus ring offset is 1px instead of 2px.

    In dark mode the pressed and active fills of filled controls (`--primary-dark`, `--secondary-dark`, `--error-dark`, `--success-dark`, `--info-dark`, `--warning-dark`) are now one step darker than the resting color but still light, so the near-black `on-*` text keeps its contrast. They used the dark shades of the light mode, which put dark text on a dark fill when a filled button was pressed or selected.

- [#637](https://github.com/ecopages/radiant/pull/637) [`26f6150`](https://github.com/ecopages/radiant/commit/26f61508f3ebba9b643fc93ab457f2e384452667) Thanks [@andeeplus](https://github.com/andeeplus)! - The remove button of a `RuiTagGroup` tag draws a smaller, quieter cross inside its 16px hit area, and a tag that has one trades some end padding for it, so the cross no longer crowds the label.

- [#637](https://github.com/ecopages/radiant/pull/637) [`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889) Thanks [@andeeplus](https://github.com/andeeplus)! - The toast close button now sits inside the toast, at the end of the row (at the start for toasters positioned at the start of the screen), as a 24px ghost button with a 14px icon instead of a 20px badge on the corner whose icon filled the circle. The knob arc ends follow `--rui-knob-linecap` (`round`, `butt` or `square`, default `round`); the sharp radius pack and the Zed, VS Code, High Contrast, Windows 95 and Mac OS Classic themes set `butt`, and a `--rui-radius-scale` of exactly 0 squares the ends too.

    Tags in `RuiTagGroup` and their remove buttons follow the radius scale (`--radius-control` and `--radius-sm`) instead of staying fully rounded, so a square or lightly rounded theme gets square tags.

- [#637](https://github.com/ecopages/radiant/pull/637) [`311dea5`](https://github.com/ecopages/radiant/commit/311dea533f361dd4a9057f51081774dac27135f7) Thanks [@andeeplus](https://github.com/andeeplus)! - Toast variants draw real icons instead of letters and a cross: info and warning keep their meaning with a circled `i` and a triangle exclamation, and an error toast uses a circled exclamation, so a failure no longer shows two crosses next to the close button. `@ecopages/radiant-ui/icons` exports `RuiIconAlertCircle`, `RuiIconAlertTriangle` and `RuiIconInfo`.
- Updated dependencies [[`2abd106`](https://github.com/ecopages/radiant/commit/2abd106079f005b388d49337da87118e5f51dabe)]:
    - @ecopages/radiant@0.8.1
    - @ecopages/jsx@0.8.1
    - @ecopages/signals@0.8.1

## 0.3.2

### Patch Changes

- [#624](https://github.com/ecopages/radiant/pull/624) [`9dd78b7`](https://github.com/ecopages/radiant/commit/9dd78b7c85550a8b5c6f984dfe58d58249f826a8) Thanks [@andeeplus](https://github.com/andeeplus)! - Field controls placed as a host's slotted content are found again with Radiant 0.8.0: the field lookup reads `slottedElements` instead of the removed `getSlotElements`.
- Updated dependencies:
    - @ecopages/jsx@0.8.0
    - @ecopages/radiant@0.8.0
    - @ecopages/signals@0.8.0

## 0.3.1

### Patch Changes

- [#587](https://github.com/ecopages/radiant/pull/587) [`0877ec5`](https://github.com/ecopages/radiant/commit/0877ec5a738d7bc9addbb59da2880c10f134be2b) Thanks [@github-actions](https://github.com/apps/github-actions)! - Correct the hover card documentation: the warmup and cooldown are shared between hover cards only, and `rui-tooltip` keeps its own `delay`.

- [#587](https://github.com/ecopages/radiant/pull/587) [`26dbfe5`](https://github.com/ecopages/radiant/commit/26dbfe523af7230f95998e99869d8680fd820726) Thanks [@github-actions](https://github.com/apps/github-actions)! - `rui-calendar` and `rui-date-range-picker` now preview the range while hovering a day after the start is chosen, and clear the preview when the pointer leaves the grid.

- [#587](https://github.com/ecopages/radiant/pull/587) [`dfc9317`](https://github.com/ecopages/radiant/commit/dfc93175c2b794e5a7867cbf34d47dc7bf8cbd15) Thanks [@github-actions](https://github.com/apps/github-actions)! - `rui-carousel` autoplay now pauses on mouse hover, and changing `transition` after load swaps the `rui-carousel--*` animation class.

- [#587](https://github.com/ecopages/radiant/pull/587) [`399bb68`](https://github.com/ecopages/radiant/commit/399bb68facb18896f7d4b2c104e280cc8c443a2a) Thanks [@github-actions](https://github.com/apps/github-actions)! - Combobox: the input `aria-controls` now names the live listbox id, and Escape on a closed combobox clears a committed value even when the input text was erased.

- [#587](https://github.com/ecopages/radiant/pull/587) [`48a9e27`](https://github.com/ecopages/radiant/commit/48a9e271ebf26745d88e5acd3e5b3c3b49297a3a) Thanks [@github-actions](https://github.com/apps/github-actions)! - Date field and date range picker: Escape and completing a selection return focus to the calendar button instead of dropping it to the page body. Outside clicks still leave focus where they land.

- [#587](https://github.com/ecopages/radiant/pull/587) [`b42042d`](https://github.com/ecopages/radiant/commit/b42042dfe959759cd9ad27d2399d326d1c78297c) Thanks [@github-actions](https://github.com/apps/github-actions)! - Dialog: the host `alert` prop now drives `role` (`alertdialog` or `dialog`) and limits the tab loop to the actions, live. `RuiDialogClose` keeps its visible text as its accessible name and applies the `Close` label only to the icon-only button.

- [#587](https://github.com/ecopages/radiant/pull/587) [`93a35d0`](https://github.com/ecopages/radiant/commit/93a35d0944f35ffd132fd2b337af8021a8842085) Thanks [@github-actions](https://github.com/apps/github-actions)! - Toast: the `error` variant now renders with `role="alert"`, `aria-live="assertive"` and `aria-atomic="true"`, as the docs state. Other variants keep `role="status"`.

- [#587](https://github.com/ecopages/radiant/pull/587) [`0c555a6`](https://github.com/ecopages/radiant/commit/0c555a6120961b88380b275ca76a8f18c9eddd71) Thanks [@github-actions](https://github.com/apps/github-actions)! - `rui-form` reset keeps the form `defaultValues` for fields that declare no default of their own, and `rui-combobox` and `rui-autocomplete` show every option again after a native form reset clears the typed text.

- [#587](https://github.com/ecopages/radiant/pull/587) [`bf2eb5f`](https://github.com/ecopages/radiant/commit/bf2eb5f718d082fbc5c21d10ddc1b22cfdb5796f) Thanks [@github-actions](https://github.com/apps/github-actions)! - The form store applies one rule for field defaults: `null` and `undefined` both mean "no default" when registering, updating options and resetting.

- [#587](https://github.com/ecopages/radiant/pull/587) [`fe20f16`](https://github.com/ecopages/radiant/commit/fe20f166f19fb8374993ff70a3b388c7fded021e) Thanks [@github-actions](https://github.com/apps/github-actions)! - `rui-tooltip`, `rui-hover-card` and `rui-carousel` bind their host pointer listeners through `@onEvent({ host: true })`. Behaviour is unchanged.

- [#587](https://github.com/ecopages/radiant/pull/587) [`f59e06a`](https://github.com/ecopages/radiant/commit/f59e06a891eaa8e8daef8fca8ac6ad6494889e07) Thanks [@github-actions](https://github.com/apps/github-actions)! - Hover card: moving the pointer from the trigger onto the card now keeps it open instead of closing it after `closeDelay`, and Escape dismisses the card for good instead of reopening it when focus returns to the trigger.

- [#587](https://github.com/ecopages/radiant/pull/587) [`506ace3`](https://github.com/ecopages/radiant/commit/506ace361a42f6df767f6d30c9f9d287df8db84b) Thanks [@github-actions](https://github.com/apps/github-actions)! - A nested `.dark` section on a light page now restyles kit components: the semantic color utilities read the role tokens (`--primary`, `--surface`, ...) directly where they are used, and the `--color-*` aliases are declared on `:root` and `.dark`, so they exist on a light page and follow a nested dark scope. Themes and apps should override the roles (`--primary`), not the `--color-*` aliases.

- [#587](https://github.com/ecopages/radiant/pull/587) [`c51327f`](https://github.com/ecopages/radiant/commit/c51327fa3d18f03a51527ed90c6c9671845ee487) Thanks [@github-actions](https://github.com/apps/github-actions)! - Declare the fixed host roles of `rui-sidebar` (`complementary`) and `rui-toast` (`listitem`) with `hostAttributes`. A `<rui-sidebar>` authored without its view now has its landmark role in server output, and a `role` authored on either host is kept instead of overwritten.

- [#587](https://github.com/ecopages/radiant/pull/587) [`6c2c8c2`](https://github.com/ecopages/radiant/commit/6c2c8c23d59fe0b83e56fad75aab03b76a2777a7) Thanks [@github-actions](https://github.com/apps/github-actions)! - `rui-date-range-picker` now emits `start` and `end` in `rui-change` sorted the same way as `value`, so a handler never stores an inverted range.

- [#587](https://github.com/ecopages/radiant/pull/587) [`e653858`](https://github.com/ecopages/radiant/commit/e6538588a1c5672394e0d2ce40683ae9553f5bc0) Thanks [@github-actions](https://github.com/apps/github-actions)! - Fix `registerFieldControl` not reaching `rui-field`, and `rui-checkbox-group` ignoring its checkboxes when the checkbox entry is imported first. Entries now share code through `dist/chunks/`; chunk file names are content hashes and must not be imported; use only the documented entries.

- [#587](https://github.com/ecopages/radiant/pull/587) [`73ff9f6`](https://github.com/ecopages/radiant/commit/73ff9f666001d8307c80ea7dbaa8691292b1b45f) Thanks [@github-actions](https://github.com/apps/github-actions)! - `rui-sidebar` puts its `label` only on the `complementary` landmark (the host); the roleless pane no longer carries an ignored `aria-label`. The `RuiSidebar` view stamps `role="complementary"` so server-rendered markup has a named landmark before hydration.

- [#587](https://github.com/ecopages/radiant/pull/587) [`f7d50d2`](https://github.com/ecopages/radiant/commit/f7d50d299619c7609c6aae12e1571f9ec2621af9) Thanks [@github-actions](https://github.com/apps/github-actions)! - `rui-slider` range thumbs now stop at `minDistance` on Home and End instead of jumping across the other thumb, and the held thumb rounds away from the other one so a step that does not divide `minDistance` never leaves them closer than the gap. Pointer drag also stops at the gap now instead of swapping the thumbs.

- [#587](https://github.com/ecopages/radiant/pull/587) [`a56ca9a`](https://github.com/ecopages/radiant/commit/a56ca9a06b8cfb84d68de276022a3356704eadce) Thanks [@github-actions](https://github.com/apps/github-actions)! - `rui-window-splitter` falls back to 50 when `value` is not a number instead of writing `NaN` to `aria-valuenow` and the pane size.

- [#587](https://github.com/ecopages/radiant/pull/587) [`770593e`](https://github.com/ecopages/radiant/commit/770593ed18759acc5248b8e41cc3ee19e3954cd1) Thanks [@github-actions](https://github.com/apps/github-actions)! - Table: in `selection-mode="single"`, Space on the selected row now deselects it and emits `rui-change` with an empty value, as it does in `multiple` mode. Clicking a cell still only selects.

- [#587](https://github.com/ecopages/radiant/pull/587) [`0002ba5`](https://github.com/ecopages/radiant/commit/0002ba5e08e5e4c6735097d942892c9fba9d0d60) Thanks [@github-actions](https://github.com/apps/github-actions)! - An `aria-disabled` tag in `rui-tag-group` cannot be removed: its remove control is disabled (also in the server-rendered `RuiTag`), and Delete and Backspace neither remove it nor prevent default.

- [#587](https://github.com/ecopages/radiant/pull/587) [`79f2a05`](https://github.com/ecopages/radiant/commit/79f2a057696a0ac6637cb3899f6235edf0eafd66) Thanks [@github-actions](https://github.com/apps/github-actions)! - Tag group: a `disabled` group no longer removes tags. The remove control, Delete and Backspace are now no-ops and emit neither `rui-remove` nor `rui-change`, as the docs state.

- [#587](https://github.com/ecopages/radiant/pull/587) [`4a9ee57`](https://github.com/ecopages/radiant/commit/4a9ee571580bbfccdff5b88d695e8efa74377030) Thanks [@github-actions](https://github.com/apps/github-actions)! - `rui-toaster` clears its live region and sets the new text after a short gap, so repeated toasts, toasts updated in place (such as `toast.promise()` resolving) and toasts shown together are announced; a toast that turns into an error in place is announced from an assertive region. A toast accepts `announcement` (plain announcement text) and `closeLabel` (close button name, default `Close toast`); `rui-toast` takes `close-label`.

- [#587](https://github.com/ecopages/radiant/pull/587) [`6e256fc`](https://github.com/ecopages/radiant/commit/6e256fcb188bf665b84a04c1daf1c1a95634f110) Thanks [@github-actions](https://github.com/apps/github-actions)! - Window splitter: a written `value` outside 20-80 is now clamped, so the property, the reflected `value` attribute and `aria-valuenow` all hold the clamped value instead of exceeding `aria-valuemax`.
- Updated dependencies [[`786847b`](https://github.com/ecopages/radiant/commit/786847bf357488d556ae55246d065d3e6bbebc71), [`cabe09e`](https://github.com/ecopages/radiant/commit/cabe09ed8aa153864d40b2f04ac21dfafbfb9428), [`1f83249`](https://github.com/ecopages/radiant/commit/1f832490e487ef0f775a939d3f084b33902c9c39), [`c51327f`](https://github.com/ecopages/radiant/commit/c51327fa3d18f03a51527ed90c6c9671845ee487), [`bdd45b5`](https://github.com/ecopages/radiant/commit/bdd45b53ef136b0af26e30cd41357960f61dd32e), [`29500e8`](https://github.com/ecopages/radiant/commit/29500e818f8295e3496a408f326df48fb4f7067a), [`7455450`](https://github.com/ecopages/radiant/commit/7455450bcd1207303991cd74e8ad69c67873032d), [`df5747b`](https://github.com/ecopages/radiant/commit/df5747ba1ed3d69ac7a0aa59cd9085647ad97b65), [`77d430e`](https://github.com/ecopages/radiant/commit/77d430e864a4570b2b9c0af242fbc0de449e4094), [`985768c`](https://github.com/ecopages/radiant/commit/985768c652634565ffc5f2611e9b2b923085457f), [`61c48dc`](https://github.com/ecopages/radiant/commit/61c48dc4641d2a65414f931995ab33460963f242), [`27d5705`](https://github.com/ecopages/radiant/commit/27d57053c4a0124b867025bc6894bc1ee63c42f4), [`c05f033`](https://github.com/ecopages/radiant/commit/c05f0330e0ac37d6a48efb06875d68f6f55d1c85), [`28baef3`](https://github.com/ecopages/radiant/commit/28baef3940b6a6a5d4993d3909f787c2d3ef07f0)]:
    - @ecopages/jsx@0.7.0
    - @ecopages/radiant@0.7.0
    - @ecopages/signals@0.7.0

## 0.3.0

### Minor Changes

- [#469](https://github.com/ecopages/radiant/pull/469) [`af659ff`](https://github.com/ecopages/radiant/commit/af659ff374c7185f6500abb71af22b2ef118dee0) Thanks [@andeeplus](https://github.com/andeeplus)! - **Breaking:** `RuiMeter`, `RuiCalendar`, `RuiToaster`, `RuiToc` and `RuiTabs` are now their custom-element classes instead of callable JSX wrappers; `RuiMeterElement`, `RuiCalendarElement`, `RuiToasterElement`, `RuiTocElement` and `RuiTabsElement` remain aliases of the same classes. JSX usage such as `<RuiMeter value={40} />` is unchanged; code that called an export as a function, such as `RuiMeter({ value: 40 })`, must render JSX instead. `RuiToast` and the tab helpers (`RuiTabList`, `RuiTab`, `RuiTabPanels`, `RuiTabPanel`) remain JSX views.

- [#474](https://github.com/ecopages/radiant/pull/474) [`1d35d3e`](https://github.com/ecopages/radiant/commit/1d35d3ed090dfbcc2819d03cf6beeae10e9d89ed) Thanks [@andeeplus](https://github.com/andeeplus)! - **Breaking:** Default camelCase `@prop` attributes to kebab-case (`minWidth` becomes `min-width`) across observed attributes, client updates and SSR. To migrate authored HTML, rename camelCase attributes to kebab-case; JSX property names remain camelCase. Underscores map to hyphens too (`max_width` becomes `max-width`), and `@attr` now collapses runs of underscores the same way (`a__b` becomes `a-b`, was `a--b`). Reflected and server-rendered host attributes use the new names, so update CSS selectors and `getAttribute`/`setAttribute` calls (`[exclusivetoggles]` becomes `[exclusive-toggles]`). An explicit `attribute` option, or `source` on `@attr`, keeps its configured name; choose a lowercase `attribute` value when consumers write it in HTML.

    Radiant UI hosts follow the same rule: authored HTML such as `<rui-sidebar minWidth="200">` becomes `<rui-sidebar min-width="200">`.

### Patch Changes

- [#484](https://github.com/ecopages/radiant/pull/484) [`5e83088`](https://github.com/ecopages/radiant/commit/5e83088ddb39d40a4c4401be77155ae1626e8a20) Thanks [@andeeplus](https://github.com/andeeplus)! - Type each catalog tag from its class: `<rui-alert>` and `<RuiAlertElement>` accept the class's public props (`JSX_PROPS` plus its `HTMLElementTagNameMap` entry), and views render their hosts through those classes, which also registers them.

- [#445](https://github.com/ecopages/radiant/pull/445) [`8f08f63`](https://github.com/ecopages/radiant/commit/8f08f63de84be88224d435d4d5752033c60213d1) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep the open navigation menu trigger filled under the pointer in every theme; a theme's ghost-button hover used to replace the fill while the text kept its on-container color, so Windows 95 showed white text on gray. The macOS theme also fills boxed tab panels with the white content surface instead of a gray tint, and keeps pressed ghost buttons filled on hover.

    The Windows 95 theme draws a calendar inside a date popover without its own raised frame, so the popover is one bevel and the calendar title bar sits 3px from it.

    macOS calendar days are circles, and a selected range is one continuous band with a disc on each end instead of a row of separate ovals.

- Updated dependencies [[`4058bf9`](https://github.com/ecopages/radiant/commit/4058bf9c4a2cf98db9a50938c5ee0fdca7915ffd), [`1d35d3e`](https://github.com/ecopages/radiant/commit/1d35d3ed090dfbcc2819d03cf6beeae10e9d89ed), [`ab9404f`](https://github.com/ecopages/radiant/commit/ab9404ff953a66222c6aa7a472ebf6b9adde7228), [`977785f`](https://github.com/ecopages/radiant/commit/977785fc73b327648642d4eb3a317c6e19b7ffbb), [`817a98d`](https://github.com/ecopages/radiant/commit/817a98dd64b93d9fe08c2604b68d76949e61c669), [`a2789eb`](https://github.com/ecopages/radiant/commit/a2789ebb21f5c077fbb393a0fddae89d22d38477), [`719b466`](https://github.com/ecopages/radiant/commit/719b466308b749d2864b8e184dff1583e8c476dc), [`64010bf`](https://github.com/ecopages/radiant/commit/64010bf58e782ad78439f378d1e6aef9c234e87d), [`9234d6b`](https://github.com/ecopages/radiant/commit/9234d6bef0b29f4081a7b174aff240c3db703864), [`b5d2dad`](https://github.com/ecopages/radiant/commit/b5d2dade53815a474c11cddf7e32d3ea8fb87338), [`df1b225`](https://github.com/ecopages/radiant/commit/df1b2250e54f7245edcebc81e6207d96d226599d), [`f48dc1a`](https://github.com/ecopages/radiant/commit/f48dc1adbd1e43f6bfa3e0aa1ba2f28e3f3f3a4b), [`a7409b7`](https://github.com/ecopages/radiant/commit/a7409b7b8573d28c656230b5870dee7c6aed0dd3), [`828dd15`](https://github.com/ecopages/radiant/commit/828dd15882a04e81b98e152a4d5dbd78716f5393), [`76b8c27`](https://github.com/ecopages/radiant/commit/76b8c27e8e73db1b69ed1ba056c10b41232d43b1)]:
    - @ecopages/radiant@0.6.0
    - @ecopages/jsx@0.6.0
    - @ecopages/signals@0.6.0

## 0.2.5

### Patch Changes

- [#400](https://github.com/ecopages/radiant/pull/400) [`138e059`](https://github.com/ecopages/radiant/commit/138e0593b3e33026834663deb9661240deff9e44) Thanks [@andeeplus](https://github.com/andeeplus)! - Reject children on views whose element renders its own content. `RuiDateInput`, `RuiCalendar`, `RuiToaster`, `RuiToast`, `RuiToc` and `RuiMeter` accepted children and then dropped them, because the element's first render replaced them. Their props now type `children` as `never`, as do the helpers that forward to them: `RuiDateFieldInput`, `RuiDateFieldCalendar`, `RuiDateRangePickerStartInput`, `RuiDateRangePickerEndInput` and `RuiDateRangePickerCalendar`.

    This is a type-only breaking change: no export is removed or renamed, and nothing changes at runtime. Code that passed children to one of these components now fails to type-check. Those children never rendered, so remove them, or render the content next to the component, for example a hint below `RuiDateInput`.

- [#424](https://github.com/ecopages/radiant/pull/424) [`a806505`](https://github.com/ecopages/radiant/commit/a806505a57bd6f0b36b9eafbb16a61c985f487d0) Thanks [@andeeplus](https://github.com/andeeplus)! - **Breaking (types only): the `rui-meter`, `rui-toc`, `rui-toast`, `rui-toaster`, `rui-date-input` and `rui-calendar` tags reject children.** These tags are rendered by their views and never read children, so a body child is now a type error. To migrate, remove the children, or pass the content through the view's props.

    Also changed: a hydrated element's properties are written once instead of twice, the separator view rejects children like the other views, and the docs and the published typings describe named regions as properties.

- [#398](https://github.com/ecopages/radiant/pull/398) [`a28be28`](https://github.com/ecopages/radiant/commit/a28be2820c65923727be2a93eae6fcb75a06dce7) Thanks [@andeeplus](https://github.com/andeeplus)! - Fix `RuiTooltip` rendering its trigger and tooltip surface twice in the browser. `<rui-tooltip>` no longer overrides `render()`; the view stamps the only shell, so there is one `[data-ref="trigger"]` and one `[role="tooltip"]` that the trigger's `aria-describedby` points at. A bare `<rui-tooltip content="...">` without the `RuiTooltip` view no longer renders a trigger and surface by itself: author them with the `data-ref="trigger"` and `data-ref="tooltip"` light-DOM contract and set `content`, which replaces the surface text.
- Updated dependencies [[`49fb7bc`](https://github.com/ecopages/radiant/commit/49fb7bc6047677635cb54bca72d1407bc4736024), [`cf99195`](https://github.com/ecopages/radiant/commit/cf99195398fcea80d4fe305f5478635d56fb15a7), [`6c0c391`](https://github.com/ecopages/radiant/commit/6c0c391f9304fda1156f3241c4d3fdbff68d6c50), [`a212331`](https://github.com/ecopages/radiant/commit/a2123318f90aa39d759de50047ba816bb3653532), [`eb9bbde`](https://github.com/ecopages/radiant/commit/eb9bbde483950e544fdc490c4cf0a660a9cd5a28), [`9ee89f9`](https://github.com/ecopages/radiant/commit/9ee89f964fdffc0f7ae3e9a727a02cff3a306115), [`4f73e51`](https://github.com/ecopages/radiant/commit/4f73e51003ad801448614461528930e2e2b5036d), [`7a8d32b`](https://github.com/ecopages/radiant/commit/7a8d32b97e9fb883be3b05c13814d2a45b81d91f), [`78b36b6`](https://github.com/ecopages/radiant/commit/78b36b6ec11f2213136db1d911546139fa0860b3), [`f1bbbf6`](https://github.com/ecopages/radiant/commit/f1bbbf6b8edd833e2b934779857338c5013c83d1), [`a806505`](https://github.com/ecopages/radiant/commit/a806505a57bd6f0b36b9eafbb16a61c985f487d0)]:
    - @ecopages/radiant@0.5.1
    - @ecopages/jsx@0.5.1
    - @ecopages/signals@0.5.1

## 0.2.4

### Patch Changes

- [#412](https://github.com/ecopages/radiant/pull/412) [`b2bce55`](https://github.com/ecopages/radiant/commit/b2bce5517d10fc846b8a05885f7d5bf9f0ea6a1b) Thanks [@andeeplus](https://github.com/andeeplus)! - Rewrite published `radiant-ui` declaration imports to package-relative paths so consumer TypeScript resolves component prop types.

## 0.2.3

### Patch Changes

- [#388](https://github.com/ecopages/radiant/pull/388) [`6a097db`](https://github.com/ecopages/radiant/commit/6a097db52875b557ca267146f91ea7f43324b883) Thanks [@andeeplus](https://github.com/andeeplus)! - Accept native control attributes on `RuiInput`, `RuiTextarea`, `RuiButton`, and the other native input and button helpers, so props such as `required`, `autocomplete`, `name`, and `value` type-check the same way they do on the intrinsic elements.

- [#387](https://github.com/ecopages/radiant/pull/387) [`1a08f6d`](https://github.com/ecopages/radiant/commit/1a08f6d040c27dbdaed14343facc6511fab40611) Thanks [@andeeplus](https://github.com/andeeplus)! - Emit `RuiLabel`'s `htmlFor` prop as the HTML `for` attribute so the label is associated with its control.

## 0.2.2

### Patch Changes

- [#353](https://github.com/ecopages/radiant/pull/353) [`c7b9520`](https://github.com/ecopages/radiant/commit/c7b9520b8c3e81383432f31eac3f5b08e6a66cd5) Thanks [@andeeplus](https://github.com/andeeplus)! - **@ecopages/radiant**

    `@query` and `@event` check the declared field against the value they install, under standard decorators, and the type argument of `@query` and `createQuery` is now the element type. The context decorators, `@querySlot` and `createQuerySlot` are covered in their own entries.

    **Breaking:** a single-element `@query` field must include `null`, because the query returns `null` when nothing matches. With `all: true` the field is an array. A field that leaves `null` out, or an array field without `all: true`, compiled before and no longer does:

    ```ts
    // before: compiled, and `this.input.focus()` threw when the ref was missing
    @query({ ref: 'input' }) input!: HTMLInputElement;
    @query({ ref: 'item' }) items!: HTMLLIElement[];
    // after
    @query({ ref: 'input' }) input!: HTMLInputElement | null;
    @query({ ref: 'item', all: true }) items!: HTMLLIElement[];
    ```

    `all` has to be a literal `true` or `false`, or left out, because it picks the field type. `createQuery`'s `.value` is `T[]` with `all: true` and `T | null` otherwise. With a `boolean` variable for `all` it is `Element[] | Element | null`, and `createQuery` then takes no type argument. The type argument used to be the whole result:

    ```ts
    // before
    @query<HTMLElement[]>({ selector: '.item', all: true }) items!: HTMLElement[];
    createQuery<HTMLElement[]>(this, { selector: '.item', all: true });
    // after
    @query<HTMLElement>({ selector: '.item', all: true }) items!: HTMLElement[];
    createQuery<HTMLElement>(this, { selector: '.item', all: true });
    ```

    **Breaking:** `@event` installs an `EventEmitter`, so its field has to be one, and cannot be optional:

    ```ts
    // before: compiled
    @event({ name: 'change' }) change!: string;
    @event({ name: 'select' }) select?: EventEmitter<string>;
    // after
    @event({ name: 'change' }) change!: EventEmitter<string>;
    @event({ name: 'select' }) select!: EventEmitter<string>;
    ```

    Legacy decorators never see the field type and compile as before.

    **@ecopages/radiant-ui**

    Components declare their `@query` fields with `| null` and guard the places that used them. Behaviour with complete markup is unchanged.

- [#381](https://github.com/ecopages/radiant/pull/381) [`a33c600`](https://github.com/ecopages/radiant/commit/a33c60099eb614df9880d1b0a105f13f85143609) Thanks [@andeeplus](https://github.com/andeeplus)! - Make the optional themes match the systems they reference.

    - Windows 95 gains a flat menu bar with navy menu highlights, a trackbar slider, raised arrow buttons on drop-downs and combo boxes, sunken list boxes and tree views with plus/minus boxes, pale yellow tooltips, and a dark mode whose bevels read as relief. The calendar title text is no longer navy on navy.
    - Mac OS Classic styles table and tree headers, menus, tooltips, tags, sliders and progress bars as Platinum, and unselected tabs in dark mode meet 4.5:1.
    - macOS follows Sonoma AppKit: SF Pro at 13px, hairline-outlined push buttons, accent-filled default buttons, pop-up buttons, segmented tabs above their panel, and translucent menus and popovers.
    - GitHub uses Primer's roles: blue for links, focus and selected states, green limited to the primary button, the meter and success states, and Primer's grey and danger buttons.
    - Vercel uses current Geist colors and menus, VS Code follows Light Modern and Dark Modern (26px controls at 13px, secondary buttons, editor-style tabs), Cloudflare no longer uses orange for selected items and has Kumo's 26, 36 and 40px controls, Material uses the Material 3 baseline scheme, and High Contrast keeps radios round and muted text above 7:1.
    - Popovers, toasts and table headers are styled on the elements that draw them in the themes that style them: `.rui-popover`, `.rui-toast` and `.rui-table__column`.
    - The sidebar stylesheet is layered in `@layer components`, so themes can style the active item.

- Updated dependencies [[`9627747`](https://github.com/ecopages/radiant/commit/9627747aa6d583dcb256d1e46190cfe58802f02e), [`6ccd110`](https://github.com/ecopages/radiant/commit/6ccd110e62a2b562a5d1e5e2e9f62ea29eb6c340), [`c5a80bc`](https://github.com/ecopages/radiant/commit/c5a80bc279ec0a99c067eef356b88662da2be929), [`965f3ff`](https://github.com/ecopages/radiant/commit/965f3ff94e73e437f09082bd6bcaa69457e30127), [`2d5caa5`](https://github.com/ecopages/radiant/commit/2d5caa52eded75d05b4b34e66f20b86137a8ec97), [`c7b9520`](https://github.com/ecopages/radiant/commit/c7b9520b8c3e81383432f31eac3f5b08e6a66cd5), [`54fe77a`](https://github.com/ecopages/radiant/commit/54fe77a6e688b65cd0481ff273387b5782fedcc6), [`9ffeb18`](https://github.com/ecopages/radiant/commit/9ffeb18017b38af04dbed5c56f689bf9ae5b4e04), [`ce702f5`](https://github.com/ecopages/radiant/commit/ce702f503fc6b231f1a7910b62a5b0e37d7fd258), [`e2fbfed`](https://github.com/ecopages/radiant/commit/e2fbfedd7b3e9847228ed699061e7c27da8b92d3)]:
    - @ecopages/radiant@0.5.0
    - @ecopages/jsx@0.5.0
    - @ecopages/signals@0.5.0

## 0.2.1

### Patch Changes

- [#322](https://github.com/ecopages/radiant/pull/322) [`09b2088`](https://github.com/ecopages/radiant/commit/09b208841fca88373ae77c3c9e7db4e4436af225) Thanks [@andeeplus](https://github.com/andeeplus)! - Refine the theme catalog released in 0.2.0.

    - Composite fields draw one frame in every theme, including the classic-theme field treatments, and the standalone `rui-date-input` surface follows the same rule.
    - Treegrids read as trees in every theme: no divider under each row, only the header rule. VS Code, GitHub, macOS, Mac OS Classic and Windows 95 add per-level indentation and their native disclosure affordances.
    - Cloudflare's primary orange is `#cc3a00` in light and dark mode (5:1 against white) instead of switching to the brighter orange in dark mode.
    - Polish theme catalog controls across the optional themes.

- Updated dependencies [[`c9cc095`](https://github.com/ecopages/radiant/commit/c9cc095366e09d0251684a290d049f68f4c75369), [`33f9c54`](https://github.com/ecopages/radiant/commit/33f9c549f4bb23c5c6dcd8efc98d4f070a8ce88d), [`3f137ca`](https://github.com/ecopages/radiant/commit/3f137caf6c7418c4b105c45a23422c5a44f70fcb), [`dc5b87f`](https://github.com/ecopages/radiant/commit/dc5b87f6f5d4b2275cff0eb2dd9b4904f0321107), [`375b200`](https://github.com/ecopages/radiant/commit/375b20007b1a93778e1f907838e6365881420260), [`e5b9ff6`](https://github.com/ecopages/radiant/commit/e5b9ff62ac3ed1eba201d08e8054a12142d045c2), [`0121714`](https://github.com/ecopages/radiant/commit/0121714d5e3358e65256c5231cd614bd8ab81c60), [`dad8379`](https://github.com/ecopages/radiant/commit/dad8379fae51087328da8946e6a0c53bdb55f724), [`4bf5a10`](https://github.com/ecopages/radiant/commit/4bf5a10a96e2c72ffb21714b5442516eb86baf7d), [`6ff24ce`](https://github.com/ecopages/radiant/commit/6ff24cee309429cf2332d8be6e95c9a73ea194d1), [`2f53f5b`](https://github.com/ecopages/radiant/commit/2f53f5b1c67ae9ae52092b75fb30bb84acdb0234)]:
    - @ecopages/jsx@0.4.0
    - @ecopages/radiant@0.4.0
    - @ecopages/signals@0.4.0

## 0.2.0

### Minor Changes

- [#306](https://github.com/ecopages/radiant/pull/306) [`a3a8234`](https://github.com/ecopages/radiant/commit/a3a8234c107b5955ce3cd983ba4edcc3fae18821) Thanks [@andeeplus](https://github.com/andeeplus)! - Radiant UI now ships one OKLCH-derived Radiant Default theme with stronger control boundaries and shared accessibility support. `@ecopages/radiant-themes` adds High Contrast, Windows 95, Mac OS Classic, macOS, and Material Design alongside GitHub, VS Code, and Vercel. Each optional theme includes its own font stacks, a compact variant, and component-specific styling where needed.

    If your app used an earlier Radiant palette or preset export, switch to the single default theme and tune `--rui-primary`, `--rui-secondary`, and `--rui-neutral`, or install `@ecopages/radiant-themes/<theme>` for a complete visual system. For compact spacing, import `@ecopages/radiant-ui/tokens/spacing/compact` after Radiant Default, or use a complete theme's `/compact` export, such as `@ecopages/radiant-themes/github/compact`. See the [theme migration guide](https://radiant.ecopages.app/docs/getting-started/theming).

- [#306](https://github.com/ecopages/radiant/pull/306) [`a3a8234`](https://github.com/ecopages/radiant/commit/a3a8234c107b5955ce3cd983ba4edcc3fae18821) Thanks [@andeeplus](https://github.com/andeeplus)! - Make decorative borders recede. Radiant Default's semantic border alpha drops from 40% to 20%, and GitHub, VS Code, Material Design, and macOS use their subtle divider colors for `--border` instead of the strong control-border color. Control borders stay solid for accessible contrast.

### Migration from 0.1.x

0.2.0 removes these exports that 0.1.0 published. They were not listed in the notes above.

| Removed export                                                                                                         | Replacement                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `@ecopages/radiant-ui/themes/glacier`, `@ecopages/radiant-ui/themes/aurora`                                            | `@ecopages/radiant-ui/themes/default`, then tune the seed variables `--rui-primary`, `--rui-secondary` and `--rui-neutral` |
| `@ecopages/radiant-ui/themes/default-compact-soft`                                                                     | `@ecopages/radiant-ui/themes/default` followed by `@ecopages/radiant-ui/tokens/spacing/compact`                            |
| `@ecopages/radiant-ui/tokens/colors/aurora`, `tokens/colors/glacier`, `tokens/colors/basalt`, `tokens/colors/palettes` | `@ecopages/radiant-ui/tokens/colors/rui-default`, or a complete theme from `@ecopages/radiant-themes`                      |

`@ecopages/radiant-ui/themes/default` kept its path but is now the Radiant Default theme; in 0.1.0 it aliased Glacier, so its colors change. The Aurora, Glacier and Basalt palettes have no direct replacement; set the seed variables to approximate them. For a compact optional theme, import its compact entry, such as `@ecopages/radiant-themes/github/compact`.

## 0.1.0

First stable of the Radiant UI catalog: view-owned light-DOM shells, form-associated controls, and CSS knobs on the host.

### Breaking Changes

- Composite `Rui*` views own chrome and authored children in the light DOM. Custom-element `<slot>` markup from earlier pre-1.0 cuts is not the public API; migrate to the documented view helpers or equivalent light-DOM structure.
- `FormAssociation` is removed. Form-associated hosts extend `FormAssociatedElement` from `@ecopages/radiant/form-associated-element`.
- Rui JSX views type the declared root host (`JsxCustomElementAttributes` or `JsxElementProps`). Direct kebab-case ARIA/data attributes take precedence over structured values. Deprecated select/combobox option aliases and mask helper aliases are gone.
- `RuiTextarea` no longer accepts `size`; height comes from `rows` and the shared control tokens.
- `@floating-ui/dom` is gone. Tooltips and menu buttons use the in-package floating helper.

### Minor Changes

- Add composable presentational building blocks: `RuiHeadline`, `RuiHeading`, `RuiAvatar`, `RuiButtonGroup`, `RuiChip`, and `RuiChipList`. `RuiFeed` is a presentational compound component (the `rui-feed` custom element is gone).

- Add calendar, date, number, popover, select, autocomplete, and tag-group components. `RuiNumberField` is the number-entry control (`minValue` / `maxValue`).

- Drop `@floating-ui/dom` and position tooltips and menu buttons with `computeFloatingCoords` / `attachFloating` (fixed placement, primary-axis flip, cross-axis clamp).

- Complete every named hue scale to steps 50–975. `--color-black` and `--color-white` live in `tokens/system.css` so every theme gets them without loading Aurora.

- Uncontrolled `rui-sidebar` applies `mobileDefaultOpen` when the viewport crosses into mobile, not only on first connect.

- Compile published CSS with Tailwind v4 PostCSS so dist ships browser-ready styles (no `@apply` / `@reference`), while theme and token values stay CSS custom properties for runtime swaps.

- [#179](https://github.com/ecopages/radiant/pull/179) [`4f51ceb`](https://github.com/ecopages/radiant/commit/4f51cebbda41329d4629a6babe32cbed8e10e106) Thanks [@andeeplus](https://github.com/andeeplus)! - Add a `square` modifier to `RuiButton` for icon-only actions, composable with control sizes such as `sm` and `lg`.

- [#230](https://github.com/ecopages/radiant/pull/230) [`c0128ad`](https://github.com/ecopages/radiant/commit/c0128ad36b5a06dbe93d16ea15a6d8197a6ea34e) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `slidesPerView` and `slidesPerGroup` so a carousel can show a window of slides.

    **@ecopages/radiant-ui**

    - `slides-per-view` (`>= 1`, fractional peek allowed) is how many slides fill the viewport. `index` is the first visible slide.
    - `slides-per-group` is how far prev/next/autoplay/swipe move. A window of more than one slide paints separate cards; a single pane keeps chrome on the viewport.
    - Card gap, radius, border, fill, and padding are `--rui-carousel-*` custom properties with theme-token defaults. Override them on `rui-carousel`.
    - Multi-slide indicators select valid windows, including the last window. Pausing autoplay restores live-region announcements.

- [#199](https://github.com/ecopages/radiant/pull/199) [`b054bd0`](https://github.com/ecopages/radiant/commit/b054bd029bc1f4312efa73933a15d3b969e31e74) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `RuiCheckboxGroup` for coordinating multiple `RuiCheckbox` options as a single multi-value form field.

    **@ecopages/radiant-ui**

    - New `<rui-checkbox-group>` host with `RuiCheckboxGroupControl`, `options` convenience API, and `orientation` layout.
    - Comma-separated `value` protocol matches multi-select controls; integrates with `RuiField` / `RuiForm`.

- [#259](https://github.com/ecopages/radiant/pull/259) [`7cfa0e5`](https://github.com/ecopages/radiant/commit/7cfa0e5187e7b5abe910677c3c9dd32be175ef95) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `rui-date-input` / `@ecopages/radiant-ui/date-input` with per-unit locale segments, a hidden ISO form value, and spinbutton accessibility. Default markup stamps `data-rui-control` and `data-rui-control-type="date"` so standalone `RuiField` discovery works without extra attributes.

- [#259](https://github.com/ecopages/radiant/pull/259) [`8cb1f83`](https://github.com/ecopages/radiant/commit/8cb1f832e3085c0402f3766e30058e06b6f0df31) Thanks [@andeeplus](https://github.com/andeeplus)! - Date fields and range pickers now use React Aria-style locale segments instead of a single formatted text box, so tapping a unit replaces just that part and mobile keyboards stay numeric.

    **@ecopages/radiant-ui**

    - `RuiDateField` and `RuiDateRangePicker` embed `rui-date-input`; removed `dateStyle`, `masked`, and string `placeholder` props from those hosts.
    - Nested range inputs keep in-progress dates until both sides are valid; the host `value` is the committed `start/end` range only.
    - Light-DOM contract: `[data-date-field-input]` and `[data-range-start]` / `[data-range-end]` are nested `rui-date-input` hosts, not `<input type="text">`.

- [#287](https://github.com/ecopages/radiant/pull/287) [`0190865`](https://github.com/ecopages/radiant/commit/0190865052ef78782f38d245bb0f489a28d23c06) Thanks [@andeeplus](https://github.com/andeeplus)! - `rui-date-input`, `rui-number-field`, `rui-slider`, and `rui-knob` extend `FormAssociatedElement`. `FormAssociation` is removed; third-party hosts should extend the platform base. `RuiField` copies `disabled` onto a form-associated child and never names that host's inner input.

- [#163](https://github.com/ecopages/radiant/pull/163) [`0d4e4f5`](https://github.com/ecopages/radiant/commit/0d4e4f53621dbf6830fbdf23305383ad386576c4) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `RuiForm` `onSubmit`, `action`, and `method` support, plus form-context error state. `onSubmit` receives validated values; without it, forms with an action or method submit natively after validation.

- [#207](https://github.com/ecopages/radiant/pull/207) [`4ef2a9f`](https://github.com/ecopages/radiant/commit/4ef2a9f3459bc1e83e6c5b8bf14d024f68bc65ff) Thanks [@andeeplus](https://github.com/andeeplus)! - Unify listbox-backed selection across select, combobox, and standalone listbox with shared host controllers and consistent field labeling.

    - Add `ListboxHostController` and `listbox-option` helpers for embedded listbox sync, comma-separated values, and tag-group chips.
    - Export `@ecopages/radiant-ui/icons` with `RuiIconCheck` and `RuiIconX`; use them in listbox, select, combobox, tag-group, dialog, and toast.
    - Wire `RuiField` labels to composed controls through `aria-labelledby`, including listbox surfaces in form fields.

- [#195](https://github.com/ecopages/radiant/pull/195) [`a51c205`](https://github.com/ecopages/radiant/commit/a51c2058ac4fc2eda58439e79f51fbc8bf6ca9cb) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `RuiSeparator` for non-interactive horizontal and vertical dividers. Menu button and menubar now support nested submenus and `{ type: 'separator' }` entries in item trees; toolbar can divide control groups without adding a focus stop.

- [#271](https://github.com/ecopages/radiant/pull/271) [`0b05f53`](https://github.com/ecopages/radiant/commit/0b05f53c45747f6792e6a21218ca34bfcc7fc454) Thanks [@andeeplus](https://github.com/andeeplus)! - Render meter fill consistently across browsers and expose CSS properties for its track color, fill color, radius, height, and width.

- [#240](https://github.com/ecopages/radiant/pull/240) [`b8abbac`](https://github.com/ecopages/radiant/commit/b8abbac9c162317233eb8b172a559fc80faf7b21) Thanks [@andeeplus](https://github.com/andeeplus)! - Open navigation-menu flyouts as popovers under each trigger, keep the trigger bar unboxed by default, and add `openOnHover` with `hoverDelay` / `closeDelay`.

- [#179](https://github.com/ecopages/radiant/pull/179) [`0abab03`](https://github.com/ecopages/radiant/commit/0abab036d3e97af72266508d2cf026ae8b236611) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `RuiSpinner`, `RuiBadge`, and `RuiInputGroup` for loading indicators, status labels, and input addons.

    **@ecopages/radiant-ui**

    - `RuiSpinner` — inline loading indicator with `sm` / `md` / `lg` sizes.
    - `RuiBadge` — compact status label with `filled`, `outline`, `destructive`, `ghost`, and `muted` variants.
    - `RuiInputGroup` — bordered row for `RuiInput` with leading/trailing addons (`RuiInputGroupAddon`, `RuiInputGroupText`).

- [#226](https://github.com/ecopages/radiant/pull/226) [`dd21362`](https://github.com/ecopages/radiant/commit/dd213624055eb26712df1715a10735d5c88cbbfe) Thanks [@andeeplus](https://github.com/andeeplus)! - Paint 1:1 field-to-DOM copies on catalog hosts with `@bindTo` instead of `@onUpdated` glue.

    **@ecopages/radiant-ui**

    - Straight attribute, boolean, property, and text sync (hidden, aria-expanded, aria-label, input `checked` / `disabled`, and similar) now uses `@bindTo`.
    - `@onUpdated` remains for procedures: focus, describedby joins, pointer math, and any branched write.

- [#179](https://github.com/ecopages/radiant/pull/179) [`5d6adfa`](https://github.com/ecopages/radiant/commit/5d6adfa8dff3eaf414c91ba84ca90b02f8cb6fde) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `RuiHoverCard` for rich hover previews with composable trigger and content.

- [#173](https://github.com/ecopages/radiant/pull/173) [`c5f5805`](https://github.com/ecopages/radiant/commit/c5f5805a2151de186d2ff6506660eae8e6bde027) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `RuiKnob`, a rotary numeric control with a 300° value arc, keyboard stepping, and optional value readout.

- [#173](https://github.com/ecopages/radiant/pull/173) [`c5f5805`](https://github.com/ecopages/radiant/commit/c5f5805a2151de186d2ff6506660eae8e6bde027) Thanks [@andeeplus](https://github.com/andeeplus)! - Move composite JSX APIs to view-owned light-DOM shells so parent reconciliation no longer fights custom-element slot projection.

    **@ecopages/radiant-ui**

    - Composite `Rui*` views now own chrome and author children in the light DOM; coordinating custom elements query `data-ref` / `data-*` targets and toggle volatile attrs imperatively instead of re-rendering through CE `<slot>`.

        This is a breaking pre-1.0 change for consumers who authored the previous slot-based markup directly: migrate to the documented `Rui*` view helpers or equivalent light-DOM structure.

    - Migrated composites include table, dialog, form, field, select, listbox, checkbox, combobox, autocomplete, menu-button, tooltip, hover-card, switch, breadcrumb, popover, toolbar, grid, tree, treegrid, tag-group, menubar, disclosure (and group), window-splitter, number-field, navigation-menu, carousel, and sidebar (with trigger).
    - Popup visibility and placeholder state use `toggleAttribute` so parent re-renders do not fight `moveRangeBefore`.
    - Table sync narrows imperative `tabIndex` updates to structure changes and keyboard focus, avoiding churn during `aria-busy` refreshes.

- [#179](https://github.com/ecopages/radiant/pull/179) [`496bf19`](https://github.com/ecopages/radiant/commit/496bf194d90ed760120b9183f3b99b67291319c5) Thanks [@andeeplus](https://github.com/andeeplus)! - Add composable Table and Pagination primitives with keyboard navigation, row selection, sorting, accessible page navigation, and responsive table layouts.

- [#278](https://github.com/ecopages/radiant/pull/278) [`371b93c`](https://github.com/ecopages/radiant/commit/371b93cbf39b4a71d0e034d8023e425c03941fcf) Thanks [@andeeplus](https://github.com/andeeplus)! - Named `rui-date-input`, `rui-number-field`, `rui-slider`, and `rui-knob` are form-associated: `name` on the host submits through native `FormData` like `<input>`. Form reset restores the value the control was given. `RuiField` copies `name` onto that host and remains the `RuiForm` connector. Hidden form inputs on those hosts are gone.

    Registered custom controls can declare whether the host, a native input, or neither submits. Fieldset disability no longer changes an authored `disabled` attribute, and clearing a field name removes it from native submission. Empty named dates submit an empty string.

- [#230](https://github.com/ecopages/radiant/pull/230) [`14c3710`](https://github.com/ecopages/radiant/commit/14c3710b6a1328407146e29efc3e36f8e5f04300) Thanks [@andeeplus](https://github.com/andeeplus)! - Expose host-level `--rui-*` CSS knobs with catalog defaults so instances can be restyled in CSS without a JS theme object.

    **@ecopages/radiant-ui**

    - Public knobs are declared on the host (or the portaled surface). Do not set them on an inner grain — that blocks inheritance.
    - Switch, dialog, tooltip, tabs, knob, and avatar declare defaults on the host or root class. Popover and hover-card declare them on the portaled panel class.
    - Toaster stack variables are prefixed (`--rui-toaster-width`, `--rui-toast-y`, …). `gap` and `offset` attributes still win over CSS.

- [#270](https://github.com/ecopages/radiant/pull/270) [`9c0763e`](https://github.com/ecopages/radiant/commit/9c0763ec3789e47d07f3e358f1223798552538c3) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `trigger-kind` (`focus` | `manual`) on `<rui-select>` to opt into opening the listbox when the trigger receives focus, aligned with combobox `triggerKind`.

- [#179](https://github.com/ecopages/radiant/pull/179) [`feab2d2`](https://github.com/ecopages/radiant/commit/feab2d23e06f1ebe7de87b05fe29d59407d83e9f) Thanks [@andeeplus](https://github.com/andeeplus)! - Range sliders now submit `[min, max]` through forms (`name` plus `name-max`), share the numeric keyboard model with knobs, and keep vertical fill positioning in CSS.

### Patch Changes

- [#179](https://github.com/ecopages/radiant/pull/179) [`4f51ceb`](https://github.com/ecopages/radiant/commit/4f51cebbda41329d4629a6babe32cbed8e10e106) Thanks [@andeeplus](https://github.com/andeeplus)! - Give `RuiButton` slightly more inline padding than field chrome so short labels sit more comfortably at each control size.

- [#215](https://github.com/ecopages/radiant/pull/215) [`25a547b`](https://github.com/ecopages/radiant/commit/25a547b75e19f07a54d5dd6d41c82c92e8ae7774) Thanks [@andeeplus](https://github.com/andeeplus)! - Scale button and input control heights with the spacing pack so compact and wide density change both axes, not only inline padding.

- [#278](https://github.com/ecopages/radiant/pull/278) [`83565f8`](https://github.com/ecopages/radiant/commit/83565f8968c2447db4eb1604f2404796b2fe0cda) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep a partly typed `rui-date-input` date when props other than `value` or `locale` change. Before this fix, setting `label`, `min`, `max`, `disabled`, `read-only`, or `name` mid-entry threw away the typed digits. Add the `--on-focus-ring` color token (Tailwind `on-focus-ring`), paired with `--focus-ring` and defaulting to `--on-primary`, for text on a focus-ring fill.

- [#271](https://github.com/ecopages/radiant/pull/271) [`2062c0a`](https://github.com/ecopages/radiant/commit/2062c0a995f8b1bdc7741a7862421ac73fdcc4a1) Thanks [@andeeplus](https://github.com/andeeplus)! - Improve focused date input segment contrast across browser text rendering.

- [#287](https://github.com/ecopages/radiant/pull/287) [`5aed321`](https://github.com/ecopages/radiant/commit/5aed3210c1b3211ef44f2e46c3b4be14a2802192) Thanks [@andeeplus](https://github.com/andeeplus)! - `rui-date-input` commits the draft once per keystroke, focus move, or blur. Blurring no longer runs the leave and blur passes back to back, and completing a unit no longer rebuilds the segments twice. Focus reaches the next unit by the time `updateComplete` resolves, and a segment rebuild no longer pulls focus back after it has left the control.

- [#277](https://github.com/ecopages/radiant/pull/277) [`9108c56`](https://github.com/ecopages/radiant/commit/9108c568af8739bb2f672214f3a73c2341fa436a) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep date-input segment typing in a local draft until the unit completes, and stop delayed selection from stealing focus between segments.

- [#251](https://github.com/ecopages/radiant/pull/251) [`a3abae1`](https://github.com/ecopages/radiant/commit/a3abae15ab6144a9e4fc8e2d3d65b5fe938a92d4) Thanks [@andeeplus](https://github.com/andeeplus)! - Support customizable indicator position on disclosure triggers and default to chevron-down icon.

    **@ecopages/radiant-ui**

    - Add `icon` and `iconPosition` (`'start' | 'end'`) props to `RuiDisclosure` when using `trigger`.
    - Update `RuiDisclosureIcon` default chevron variant to render `RuiIconChevronDown`.
    - Export `RuiDisclosureIconProps`, `RuiDisclosurePanelProps`, `RuiDisclosureTriggerProps`, and `RuiDisclosureViewProps` from `@ecopages/radiant-ui/disclosure`.

- [#294](https://github.com/ecopages/radiant/pull/294) [`6213258`](https://github.com/ecopages/radiant/commit/621325874450fc8892b78f91ec381c94d19e0c01) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep date input and knob reset values when their form field name is assigned after the control connects.

- [#259](https://github.com/ecopages/radiant/pull/259) [`167b43c`](https://github.com/ecopages/radiant/commit/167b43cfe131cbaaa0d6a88af90cf7ee6c4fe212) Thanks [@andeeplus](https://github.com/andeeplus)! - Field ARIA wiring reads `data-rui-aria-target` / `data-rui-aria-targets` from the control host instead of a hardcoded date-field selector map. Floating surfaces keep a viewport-padded cross-axis and restore `matchAnchorWidth` styles when that option is turned off.

- [#254](https://github.com/ecopages/radiant/pull/254) [`4c2d47f`](https://github.com/ecopages/radiant/commit/4c2d47faf1a86e5a472020d31cd9a924b91a567e) Thanks [@andeeplus](https://github.com/andeeplus)! - Publish the live `FormStore` on `formContext.store` so scoped consumers can read and mutate values without reaching into the host.

    Hydration payloads still contain presentation only (`ready`, `revision`, `fields`, `errors`).

- [#212](https://github.com/ecopages/radiant/pull/212) [`ebc9a85`](https://github.com/ecopages/radiant/commit/ebc9a857c91c67a385b38f81154e3e7005c31918) Thanks [@andeeplus](https://github.com/andeeplus)! - Open hover-card on focus only when focus enters from outside the trigger/surface tree, and seed `hidden` on the preview surface before the host syncs.

- [#278](https://github.com/ecopages/radiant/pull/278) [`7562d9e`](https://github.com/ecopages/radiant/commit/7562d9e7957fbd08311a5fbc2382aeb973c9d243) Thanks [@andeeplus](https://github.com/andeeplus)! - `<rui-combobox trigger-kind="focus">` no longer ignores the next focus after it refocuses its own input. Select and combobox now share one focus-open rule: only focus arriving from outside the host opens the listbox.

- [#204](https://github.com/ecopages/radiant/pull/204) [`97b8b3b`](https://github.com/ecopages/radiant/commit/97b8b3bbcd750b59d25cd0f058381795cfb0dea4) Thanks [@andeeplus](https://github.com/andeeplus)! - Give menubar and menu-button items a visible hover fill via `--rui-menu-item-hover` (defaults to `--surface-container-low`).

- [#278](https://github.com/ecopages/radiant/pull/278) [`b0e40ef`](https://github.com/ecopages/radiant/commit/b0e40ef41333997cdb940ef84b5c643b2fde310d) Thanks [@andeeplus](https://github.com/andeeplus)! - Clamp the meter percent readout to `0%`–`100%` so out-of-range values match the native `<meter>` and the visual fill.

- [#234](https://github.com/ecopages/radiant/pull/234) [`fdaa242`](https://github.com/ecopages/radiant/commit/fdaa24217cebdef0d20b9600d717cae99838e9ed) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep comma-separated HTML `value` attributes on multi-select hosts, and expose the live JS property and `rui-change` detail as arrays.

    HTML `value="ca,tx"` is unchanged. JSX may still pass a string. If you read `element.value` or `event.detail.value` as a string, update:

    - `select.value === 'cat'` → `select.value[0] === 'cat'` or `select.value.includes('cat')`
    - `event.detail.value.split(',')` → `event.detail.value` is already `string[]`
    - Slider `value` is `number[]` (`[50]` or `[25, 75]`). Drop `values` / `rangeMin` / `rangeMax` view props; pass `value={[25, 75]}`.
    - Form `defaultValues` / `onSubmit` for those fields: prefer arrays (`{ language: ['ts'] }`, `{ volume: [50] }`). Strings and numbers still write because the host coerces them.

- [#244](https://github.com/ecopages/radiant/pull/244) [`5ddcf3e`](https://github.com/ecopages/radiant/commit/5ddcf3e4be3ea075c145d0ed2fdf73ca8faad0e1) Thanks [@andeeplus](https://github.com/andeeplus)! - Fix number-field commit on blur and give tag chips an accessible name.

    **@ecopages/radiant-ui**

    - `rui-number-field`: typed input now commits on blur. The focus/blur listeners were registered through delegation, which cannot observe non-bubbling events, so the committed `value` stayed empty after typing; they now use `focusin` / `focusout`.
    - `rui-date-range-picker`: same fix for the start/end input focus and blur handlers.
    - `rui-tag-group`: managed and authored tag chips now set `aria-label` from the item label. `listitem` has an author-only accessible name, so chips were unnamed for assistive tech and unreachable via `getByRole('listitem', { name })`.

- [#278](https://github.com/ecopages/radiant/pull/278) [`cbaf8b1`](https://github.com/ecopages/radiant/commit/cbaf8b159d63612ba72f75a431f485740f85f182) Thanks [@andeeplus](https://github.com/andeeplus)! - Apply the full narrow pagination chrome (icon-only previous / next, hidden page numbers) both below `40rem` and with `.rui-pagination--compact`, and add `previousText`, `previousLabel`, `nextText`, `nextLabel`, `pageLabel`, and `statusLabel` view props to localize the default copy.

- [#271](https://github.com/ecopages/radiant/pull/271) [`32bf820`](https://github.com/ecopages/radiant/commit/32bf8204640645170c50225d17fbcc1999f0d0f9) Thanks [@andeeplus](https://github.com/andeeplus)! - Announce the compact pagination position as “Page n of m” when the current page changes.

- [#217](https://github.com/ecopages/radiant/pull/217) [`a960b90`](https://github.com/ecopages/radiant/commit/a960b90220221bf34b792cdd57abb0941f0ee9de) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep an authored `value` through custom-element first-connect, and apply field defaults to composed select and combobox.

    **@ecopages/radiant**

    - A property assigned before upgrade, or an attribute set before first connect, is no longer replaced by an empty reflected `defaultValue`.

    **@ecopages/radiant-ui**

    - `RuiField` writes defaults to the composed select or combobox host. An embedded listbox is the parent's option surface, not a separate field control.

- [#259](https://github.com/ecopages/radiant/pull/259) [`8cb1f83`](https://github.com/ecopages/radiant/commit/8cb1f832e3085c0402f3766e30058e06b6f0df31) Thanks [@andeeplus](https://github.com/andeeplus)! - Preserve nested custom-element registration in component bundles and initialize calendar grids during SSR so date controls include their generated markup before client JavaScript runs.

- [#244](https://github.com/ecopages/radiant/pull/244) [`f6ba022`](https://github.com/ecopages/radiant/commit/f6ba022b3adbcc66c9abc25c37a34e51f4a562b9) Thanks [@andeeplus](https://github.com/andeeplus)! - Bind more catalog fields to light DOM declaratively.

    **@ecopages/radiant-ui**

    - More fields bind to light DOM declaratively via `@bindTo` (slider, knob, sidebar, sidebar-trigger, toast, toaster, date-field, date-range-picker, combobox, select, carousel). Note: `rui-toast` `dismissible` and `variant` changes now also re-sync their `data-*` attributes at update time, which previously required a remount.

- [#212](https://github.com/ecopages/radiant/pull/212) [`0b8452c`](https://github.com/ecopages/radiant/commit/0b8452c5f77aee2e7f8f8fe96d3b6112403e888e) Thanks [@andeeplus](https://github.com/andeeplus)! - Behavior hosts query `[data-ref]` instead of BEM class names.

    **@ecopages/radiant-ui**

    - Headless custom markup must stamp the published `data-ref` targets (carousel track, tooltip and hover-card trigger, form, field column, sidebar menu buttons, toaster list and toast surface). Class names remain presentation-only.

- [#173](https://github.com/ecopages/radiant/pull/173) [`c5f5805`](https://github.com/ecopages/radiant/commit/c5f5805a2151de186d2ff6506660eae8e6bde027) Thanks [@andeeplus](https://github.com/andeeplus)! - When a menu button popup includes `[data-autocomplete-input]`, opening the menu focuses that field so items can be filtered immediately.

- [#179](https://github.com/ecopages/radiant/pull/179) [`0bd6e21`](https://github.com/ecopages/radiant/commit/0bd6e21b7c28b8954ccae05f5348fb8a14b3a650) Thanks [@andeeplus](https://github.com/andeeplus)! - Make Pagination compact below 40rem: icon-only previous/next and a non-interactive `{page} / {count}` status. Numbered page controls stay on wider viewports.

- [#230](https://github.com/ecopages/radiant/pull/230) [`a1083c1`](https://github.com/ecopages/radiant/commit/a1083c1ae7ce3d7c79b7697ac08c68eb717e4e17) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep components working on HTTP origins without `crypto.randomUUID()`, and normalize off-step slider and knob values without decimal reflection loops.

- [#173](https://github.com/ecopages/radiant/pull/173) [`c5f5805`](https://github.com/ecopages/radiant/commit/c5f5805a2151de186d2ff6506660eae8e6bde027) Thanks [@andeeplus](https://github.com/andeeplus)! - Pointer drags on `RuiSlider` move focus to the active thumb so keyboard follow-up and assistive tech stay on the value being adjusted.

- [#179](https://github.com/ecopages/radiant/pull/179) [`4f51ceb`](https://github.com/ecopages/radiant/commit/4f51cebbda41329d4629a6babe32cbed8e10e106) Thanks [@andeeplus](https://github.com/andeeplus)! - Make the `xl` headline preset larger than `lg`.

- [#222](https://github.com/ecopages/radiant/pull/222) [`4a38cd3`](https://github.com/ecopages/radiant/commit/4a38cd323fcded9348ff92569f6c43a10a971613) Thanks [@andeeplus](https://github.com/andeeplus)! - Stop multi-select chip remove buttons from nesting inside a native trigger button, which aborted HTML parsing on the select docs page.

- [#294](https://github.com/ecopages/radiant/pull/294) [`6213258`](https://github.com/ecopages/radiant/commit/621325874450fc8892b78f91ec381c94d19e0c01) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep sidebar triggers scoped to the sidebar named by `controls`, and clear stale `aria-controls` when `controls` is cleared.

- [#278](https://github.com/ecopages/radiant/pull/278) [`38a55a2`](https://github.com/ecopages/radiant/commit/38a55a2535ed63d9f3826827b62c5624082f8aa9) Thanks [@andeeplus](https://github.com/andeeplus)! - Hide the inactive sidebar trigger again before hydration, and read trigger placement only from the `placement` attribute (the `rui-sidebar-trigger-placement--*` class and `data-placement` are no longer read, and the class is no longer emitted).

- [#271](https://github.com/ecopages/radiant/pull/271) [`d7ef14a`](https://github.com/ecopages/radiant/commit/d7ef14a89d89c31742dc8347442e25d5b08a21d5) Thanks [@andeeplus](https://github.com/andeeplus)! - `rui-sidebar-trigger` follows the sidebar's mobile mode once it attaches, including a breakpoint below 768px. Before hydration, trigger visibility uses the 768px viewport and only the sidebar that owns the trigger.

- [#221](https://github.com/ecopages/radiant/pull/221) [`29cb6df`](https://github.com/ecopages/radiant/commit/29cb6dfd9bd5610cad2a8c6ad4873ed4dabd54da) Thanks [@andeeplus](https://github.com/andeeplus)! - Stop slider and knob from rewriting reflected `value` when clamp only differs by IEEE rounding, which stacked overflow on the docs page.

- [#193](https://github.com/ecopages/radiant/pull/193) [`f4124c7`](https://github.com/ecopages/radiant/commit/f4124c7932315474adf1428f9ccc85362bb2c3e3) Thanks [@andeeplus](https://github.com/andeeplus)! - Slider and knob format readouts with `valuePrecision` (defaulting to the decimal places in `step`) without rounding the stored value.

- [#221](https://github.com/ecopages/radiant/pull/221) [`29cb6df`](https://github.com/ecopages/radiant/commit/29cb6dfd9bd5610cad2a8c6ad4873ed4dabd54da) Thanks [@andeeplus](https://github.com/andeeplus)! - Slider and knob unfilled tracks use `--rui-track-fill` (a mix of `--on-background`) so they stay visible on matching surfaces. `RuiSlider` and `RuiKnob` seed readout text and range geometry during SSR.

- [#259](https://github.com/ecopages/radiant/pull/259) [`1b7aaa5`](https://github.com/ecopages/radiant/commit/1b7aaa5035bb15b35a53a16edd84442b2a98dfba) Thanks [@andeeplus](https://github.com/andeeplus)! - Server-render `rui-sidebar-trigger` from the view that creates it so docs layouts include the toggle button, ARIA, and glyph before client JavaScript runs. The trigger host owns button presentation during SSR preparation and uses a stable accessible name (`triggerLabel`, defaulting to `Toggle sidebar`) across all placements.

- [#240](https://github.com/ecopages/radiant/pull/240) [`ffb342e`](https://github.com/ecopages/radiant/commit/ffb342e887b442631abcd608d07433cf5abf5051) Thanks [@andeeplus](https://github.com/andeeplus)! - Stop table row selection from double-toggling when a row checkbox is clicked, so checking a row selects it and clicking again unselects it.

- [#226](https://github.com/ecopages/radiant/pull/226) [`dd21362`](https://github.com/ecopages/radiant/commit/dd213624055eb26712df1715a10735d5c88cbbfe) Thanks [@andeeplus](https://github.com/andeeplus)! - Generated descendant ids (`aria-controls`, labelledby, option ids) are minted per instance and no longer reuse an authored host `id`.

- Updated dependencies:
    - `@ecopages/radiant@0.3.0`
    - `@ecopages/jsx@0.3.0`
    - `@ecopages/signals@0.3.0`
