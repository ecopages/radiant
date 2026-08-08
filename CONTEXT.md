# Radiant Platform

Radiant is a unified platform for building light-DOM custom elements with visible browser primitives, with companion packages for JSX authoring and signal-based reactivity.

This repository documents one shared product context at the monorepo root rather than separate package-level contexts because the published packages are designed, released, and explained as one ecosystem.

This glossary covers both the package surfaces and the platform concepts that define how the Radiant Platform is meant to be used.

That includes concepts such as light DOM, shadow DOM, decorators, host styles, and the parts that make up an element contract.

## Language

**Radiant Platform**:
The overall product context formed by Radiant, Ecopages JSX, and Ecopages Signals as one ecosystem.
_Avoid_: monorepo, workspace, package set

**Radiant**:
The core package for light-DOM custom elements and DOM-attached controllers.
_Avoid_: platform, ecosystem, @ecopages/radiant

**Ecopages JSX**:
The JSX authoring and rendering package, usable on its own or alongside Radiant.
_Avoid_: Radiant core, component model, Radiant JSX

**Ecopages Signals**:
The renderer-agnostic reactivity package, usable on its own or underneath Radiant.
_Avoid_: Radiant internals, JSX runtime

**Reactive Host**:
The shared host model that gives RadiantElement and RadiantController the same reactive fields, bindings, context, and update behavior.
_Avoid_: custom element, controller, component

**Element Host**:
A Reactive Host whose host is a real custom element with its own public tag contract.
_Avoid_: controller, behavior attachment, component class

**Render-owning Element Host**:
An Element Host that owns a rendered view and therefore participates in update, Hydration, and Slot projection behavior.
_Avoid_: passive custom element, controller host

**Render Lifecycle**:
The lifecycle of update, rerender scheduling, Hydration, and Slot projection that applies when a host owns rendered output.
_Avoid_: passive host behavior, one-off render helper

**Render Runtime**:
The internal runtime that owns the Render Lifecycle state and operations for a Render-owning Element Host.
_Avoid_: public export, generic helper bag, lifecycle utility

**Controller Host**:
A Reactive Host whose behavior attaches to existing authored DOM instead of defining a custom element.
_Avoid_: custom element, tag contract, component class

**Attribute**:
The markup-facing string channel on an element, used for serialized element state and HTML authoring.
_Avoid_: property, reactive field, object input

**Property**:
The JavaScript value channel on an element, used for direct runtime state and non-string values.
_Avoid_: attribute, markup value, serialized state

**Reactive Property**:
A Radiant property that participates in host reactivity and can map to an attribute channel when the host is a custom element.
_Avoid_: plain property, plain attribute, reactive field

**Light DOM**:
The DOM model where a host renders into the normal document tree so authored children, styling, and inspection stay directly visible.
_Avoid_: shadow root, encapsulated DOM

**Shadow DOM**:
The DOM model where a host renders into an encapsulated shadow root with its own internal tree boundary.
_Avoid_: light DOM, authored child tree

**Authored Children**:
The consumer-provided child nodes at a host boundary that remain part of the visible DOM structure.
_Avoid_: internal render output, shadow-internal children

**Hydration**:
The process of attaching client-side reactive behavior to server-rendered output without discarding the existing DOM.
_Avoid_: fresh client render, static HTML only

**SSR**:
The optional server-side rendering of HTML output before client-side behavior is attached.
_Avoid_: hydration, client-only render

**SSR Render Scope**:
The Node-only ambient render context that carries hydrate mode, custom-element render hooks, and symbol-keyed framework state across nested server renders. Ambient values live in module-owned `AsyncLocalStorage`, SSR bundlers must resolve one `@ecopages/jsx` instance (do not inline duplicate copies).
_Avoid_: browser fallback stack, globalThis ambient store, sync-only ambient state, duplicated inlined SSR modules

**SSR Context Stack**:
The Node-only ambient provider stack used during SSR so nested hosts resolve Context Providers without a DOM tree. Stored as symbol-keyed state on **SSR Render Scope** (same single-module-instance rule).
_Avoid_: separate ALS for providers, browser fallback stack, enterWith restore pattern, DOM event bubbling on the server, globalThis ambient store

**Binding**:
The connection between reactive runtime values and rendered output so targeted updates can flow into the DOM without rebuilding everything.
_Avoid_: plain property, static value, one-time markup

**Slot**:
The projection boundary inside a render-owning Element Host that accepts matching Authored Children and can provide fallback content when none are assigned.
_Avoid_: internal child list, shadow-only slot, query helper

**Context Provider**:
A host-attached context source that owns shared context state for matching descendant hosts.
_Avoid_: consumer, selector field, prop drilling

**Context Consumer**:
A descendant host that resolves a matching Context Provider so it can read or interact with shared context.
_Avoid_: provider, selector field, local state copy

## Relationships

- The **Radiant Platform** includes **Radiant**, **Ecopages JSX**, and **Ecopages Signals**
- **Ecopages JSX** can be used independently of **Radiant**
- **Ecopages Signals** can be used independently of **Radiant**
- **Radiant** is the core package of the **Radiant Platform**
- **Radiant** composes **Ecopages JSX** and **Ecopages Signals** into the core custom-element experience
- **Reactive Host** is the shared host model inside **Radiant**
- **Element Host** and **Controller Host** are the two host styles of a **Reactive Host**
- A **Render-owning Element Host** is an **Element Host** that owns rendered output and the related lifecycle
- A **Render-owning Element Host** participates in the **Render Lifecycle**
- A **Render-owning Element Host** can delegate its **Render Lifecycle** to a **Render Runtime**
- **SSR** is an optional server capability layered onto some hosts, not part of the core **Render Lifecycle**
- **Hydration** is core client behavior for a render-owning host when compatible existing DOM is present
- A default **Element Host** contract should not expose **SSR** unless server rendering is being used explicitly
- Users who want **SSR** should opt into the server rendering pipeline rather than a different default host contract
- Rendering a component to string belongs to the server rendering pipeline, not to the DOM-side host contract
- The DOM-side host contract should expose only the renderable view/state hooks that the server pipeline consumes
- Host attribute serialization should be derived in the server rendering pipeline from generic host state, not from a host-owned SSR hook
- The server rendering pipeline should read the ordinary host model directly rather than relying on dedicated server-facing accessors
- Context providers are part of the ordinary host model; hydration bindings are hydration-state infrastructure, not SSR-specific behavior
- `resolveSsrRenderBridge()` is migration-only architecture and should disappear from the target host model
- The old instance SSR surface does not need a compatibility release; it can break once the server-pipeline replacement is ready
- The first breaking cut should remove host-owned SSR attribute serialization and move it fully into the server rendering pipeline
- The server rendering pipeline may read internal host metadata directly when needed for correct serialization; that does not justify widening the public host contract
- Internal metadata reads for SSR should go through a small internal extractor module rather than being duplicated across server call sites
- That extractor belongs in the server layer, not in core
- Server extraction brands `RadiantElement` with `Symbol.for` and builds a private `InternalRadiantSsrHost` snapshot in the server extractor; it does not import the Element Host class into the extractor (shim order) and does not duck-type eight methods on arbitrary objects
- That private host shape may include explicitly transitional seams during migration, but those seams should be treated as deletion targets rather than target architecture
- An **Element Host** exposes both an **Attribute** channel and a **Property** channel
- A **Property** can hold non-string runtime values that do not fit the **Attribute** channel
- An **Attribute** carries serialized markup-facing element state
- A **Reactive Property** is a **Property** in **Radiant** that also participates in reactivity
- On an **Element Host**, a **Reactive Property** can align with an **Attribute** channel and optionally reflect back to markup
- On a **Controller Host**, a **Reactive Property** stays on the host element as a runtime **Property** channel
- **Radiant** is **Light DOM** first by default
- **Shadow DOM** is a contrasting DOM model, not the default mental model of **Radiant**
- **Light DOM** keeps authored children, styling, and DOM inspection visible at the host boundary
- **Authored Children** stay visible at the host boundary in the **Light DOM** model
- **Element Hosts** and **Controller Hosts** can work with **Authored Children** without hiding them behind **Shadow DOM** by default
- A **Slot** is the projection boundary between an **Element Host** and matching **Authored Children**
- A **Slot** can be default or named
- A **Slot** can render fallback content when no matching **Authored Children** are assigned
- A **Context Provider** owns shared context state for descendant hosts
- A **Context Consumer** resolves a matching **Context Provider** from the host tree
- **SSR** produces the server-rendered output that **Hydration** can attach to on the client
- **Hydration** consumes server-authored markup and markers, not a required per-render hydration program
- **Ecopages JSX** provides the rendering and marker model used for **Hydration**
- **Radiant** uses **Hydration** to attach live host behavior to existing rendered DOM
- A **Binding** connects runtime values to rendered output in **Ecopages JSX** and **Radiant**
- **Reactive Properties** can expose **Bindings** for targeted DOM updates
- **SSR Context Stack** is stored on **SSR Render Scope**; both require Node `AsyncLocalStorage` and have no sync fallback
- SSR scope adapters are module-local; SSR bundlers must externalize `@ecopages/*` so Node resolves one instance
- Concurrent **SSR** trees stay isolated because each request owns its own async-local store
- Async I/O such as module loading or asset resolution belongs outside **SSR Render Scope**; the scoped callback wraps the synchronous render snapshot
- Client core must not import the JSX server entry; the server layer installs scope adapters into core instead of pulling Node builtins into the browser
- Browser and Playwright tests exercise **Hydration** and DOM behavior; they do not run **SSR** writers that need **SSR Render Scope**
- Node tests own **SSR** correctness; when a hydrate test needs server markup, it uses a pre-rendered HTML fixture rather than importing the server entry in the browser

## Example dialogue

> **Dev:** "Should I document `@ecopages/jsx` and `@ecopages/signals` as separate products?"
> **Domain expert:** "No. They are separate packages, but they belong to one **Radiant Platform** context and should be documented as parts of the same ecosystem."

> **Dev:** "Is a controller a different reactive model from an element?"
> **Domain expert:** "No. Both are **Reactive Hosts**. The difference is whether the host is a custom element or behavior attached to existing DOM."

> **Dev:** "When should I use an element instead of a controller?"
> **Domain expert:** "Use an **Element Host** when you want a public custom-element contract. Use a **Controller Host** when behavior should attach to existing authored DOM."

> **Dev:** "What makes a render-owning element different from another element host?"
> **Domain expert:** "A **Render-owning Element Host** owns a rendered view, so it also owns update behavior, **Hydration**, and **Slot** projection. **SSR** is an optional server capability layered onto that host model."

> **Dev:** "What is the render lifecycle here?"
> **Domain expert:** "The **Render Lifecycle** is the combined lifecycle of update, rerender scheduling, **Hydration**, and **Slot** projection for a render-owning host. **SSR** sits beside that lifecycle as an optional server capability."

> **Dev:** "What is the render runtime?"
> **Domain expert:** "The **Render Runtime** is the internal runtime that owns the **Render Lifecycle** for a **Render-owning Element Host** while the public host surface stays small."

> **Dev:** "Why distinguish an attribute from a property here?"
> **Domain expert:** "Because an **Attribute** is the serialized markup channel, while a **Property** is the runtime value channel. A **Reactive Property** in Radiant can connect the two when that makes sense for an **Element Host**."

> **Dev:** "Why does Radiant talk so much about light DOM?"
> **Domain expert:** "Because **Radiant** is **Light DOM** first. That keeps authored children and styling visible in the normal DOM tree instead of hiding them behind **Shadow DOM** by default."

> **Dev:** "What are authored children in this platform?"
> **Domain expert:** "They are the consumer-provided child nodes at the host boundary. In **Radiant**, those **Authored Children** stay visible in the light-DOM structure instead of being treated as hidden internal implementation detail."

> **Dev:** "What does hydration mean here?"
> **Domain expert:** "**Hydration** means attaching live client behavior to server-rendered DOM that already exists, instead of discarding it and starting from a fresh client render."

> **Dev:** "Does SSR need to emit a separate hydration script for each render?"
> **Domain expert:** "No. **Hydration** should be able to adopt server-authored markup directly. Extra serialized data is optional and should only exist when the markup itself is not sufficient."

> **Dev:** "How is SSR different from hydration?"
> **Domain expert:** "**SSR** produces the HTML on the server. **Hydration** attaches client-side behavior to that existing HTML in the browser."

> **Dev:** "Should every render-owning element expose SSR directly?"
> **Domain expert:** "No. **SSR** is optional. A default **Element Host** should only participate in **SSR** when a server-rendering surface is used explicitly."

> **Dev:** "How should a user opt into SSR?"
> **Domain expert:** "By using the server rendering pipeline. **SSR** should come from explicit server-rendering surfaces, not from a different default host model."

> **Dev:** "Should a component render itself to string in the DOM-side contract?"
> **Domain expert:** "No. Rendering to string belongs to the server rendering pipeline. The DOM-side host contract should stay focused on client behavior."

> **Dev:** "What should the host expose to the server pipeline, then?"
> **Domain expert:** "Only the renderable view/state hooks the server pipeline consumes. The server pipeline can turn that data into strings without the host owning string serialization."

> **Dev:** "How should host attributes be serialized for SSR?"
> **Domain expert:** "In the server rendering pipeline, derived from generic host state such as reactive properties and existing attributes, not from a host-owned SSR hook."

> **Dev:** "Should the server pipeline use dedicated server accessors to read host state?"
> **Domain expert:** "No. It should read the ordinary host model directly. Otherwise the SSR bridge just comes back under another name."

> **Dev:** "Are context providers and hydration bindings both SSR infrastructure?"
> **Domain expert:** "No. Context providers are ordinary host state. Hydration bindings belong to hydration-state infrastructure. They may be consumed during SSR, but they are not the same kind of concern as string serialization or host attribute serialization."

> **Dev:** "Should `resolveSsrRenderBridge()` remain in the target architecture?"
> **Domain expert:** "No. That is migration-only architecture. The target model should let the server pipeline read the ordinary host state directly without a dedicated SSR bridge."

> **Dev:** "Do we need to preserve the old instance SSR surface for a release?"
> **Domain expert:** "No. Once the server-pipeline replacement is ready, the old instance SSR surface can break rather than being preserved as a compatibility release."

> **Dev:** "What should the first breaking cut remove?"
> **Domain expert:** "Host-owned SSR attribute serialization. The server rendering pipeline should derive host attributes directly from ordinary host state."

> **Dev:** "Can the server pipeline read internal host metadata to do that?"
> **Domain expert:** "Yes. The server pipeline may read internal host metadata directly when needed for correct serialization. That is preferable to widening the public host contract with SSR-oriented accessors."

> **Dev:** "Should every server module read those internals directly?"
> **Domain expert:** "No. Internal metadata reads for SSR should go through a small internal extractor module so the dependency stays explicit and centralized."

> **Dev:** "Should that extractor live in core or server?"
> **Domain expert:** "Server. SSR belongs to the server pipeline, so the extractor should be server-owned code that reads core internals, not a core-owned SSR facility."

> **Dev:** "Should server extraction use ad hoc casts into host internals?"
> **Domain expert:** "No. It should use one formalized private internal host shape so the temporary server-reading boundary stays explicit and centralized."

> **Dev:** "Must that private shape reflect the final architecture immediately?"
> **Domain expert:** "No. It may include explicitly transitional seams during migration, as long as those seams are treated as deletion targets rather than permanent architecture."

> **Dev:** "What does binding mean in this platform?"
> **Domain expert:** "A **Binding** is the connection from a reactive runtime value to rendered output, so the DOM can update the affected part without rebuilding the whole view."

> **Dev:** "What is a slot in Radiant?"
> **Domain expert:** "A **Slot** is the projection boundary where an **Element Host** accepts matching **Authored Children**. It can be default or named, and it can render fallback content when nothing is assigned."

> **Dev:** "What is the difference between a context provider and a consumer?"
> **Domain expert:** "A **Context Provider** owns the shared context state. A **Context Consumer** resolves that provider from the host tree so it can read or interact with the shared state."

> **Dev:** "Do we keep a sync fallback for SSR ambient state when tests run in the browser?"
> **Domain expert:** "No. **SSR Render Scope** (including the **SSR Context Stack** stored on it) requires Node `AsyncLocalStorage`. A fallback is a smell; change the test boundary instead of carrying a second ambient model."

> **Dev:** "Can I await fetch inside `withActiveSsrScopeValue(...)`?"
> **Domain expert:** "Await I/O outside the scope. Enter **SSR Render Scope** only for the synchronous render snapshot so abandoned async work cannot leak ambient state."

> **Dev:** "Where should `renderToString` tests live?"
> **Domain expert:** "In Node `*.test.*` files. Browser `*.browser.test.*` and Playwright `*.e2e.test.*` files hydrate from fixtures or client-only trees; they do not import the JSX server entry to perform SSR."

> **Dev:** "What do the test file suffixes mean?"
> **Domain expert:** "`*.test.*` runs on Node and owns **SSR**. `*.browser.test.*` runs in happy-dom for DOM behavior without Playwright. `*.e2e.test.*` runs in Playwright Chromium when real-browser behavior is required."

## Flagged ambiguities

- "context" is overloaded in this repository: the product already uses **Context** for runtime state-sharing APIs inside Radiant, while this file uses context in the domain-modeling sense for the whole **Radiant Platform**
- "standalone" does not mean "separate product context" here: **Ecopages JSX** and **Ecopages Signals** are standalone-capable packages inside the same **Radiant Platform**
- docs apps and playgrounds are support surfaces for the **Radiant Platform**, not glossary concepts in this context file
- test file suffixes are contributor conventions, not product glossary terms, but they encode the **SSR** / **Hydration** boundary: `*.test.*` = Node (**SSR**), `*.browser.test.*` = happy-dom, `*.e2e.test.*` = Playwright
- mixed Node files that need a DOM may use `// @vitest-environment happy-dom`; that still counts as a Node **SSR**-capable process, not a browser fallback for ambient state
- browser and Playwright suites must not import `@ecopages/jsx/server` as an **SSR** writer; hydrate tests use fixtures or client-only trees
- Node is the source of truth for server runtime; do not document or branch on Bun as a separate SSR ambient model
- glossary terms use human-facing product names, not npm package identifiers
- this glossary is meant to capture platform-defining concepts, not just package identities
- **Reactive Host** is the umbrella concept above custom-element and controller host styles
- **Render-owning Element Host** is a narrower concept than **Element Host** and should be used when render lifecycle behavior matters
- **Render Lifecycle** is the architectural concept behind `update()`, `requestUpdate()`, **Hydration**, and **Slot** projection
- **SSR** is intentionally modeled as an optional server capability rather than part of the core **Render Lifecycle**
- **SSR Context Stack** are Node-only ambient contracts with no sync fallback; a fallback means the test or package boundary is wrong
- **Hydration** is intentionally kept in the core **Render Lifecycle** because it changes client host behavior when existing DOM is present
- **Hydration** should rely on server-authored markup and markers by default, not on a required generated hydration program
- A default **Element Host** contract should stay client-oriented; explicit server-rendering surfaces should carry **SSR**
- Users should opt into **SSR** through the server rendering pipeline, not through a second default host model
- String serialization is a server-pipeline concern, not a default DOM-side host responsibility
- The DOM-side host contract should stay narrow and expose only renderable view/state hooks that explicit server-rendering surfaces consume
- Host attribute serialization should stay in the server pipeline and be derived from generic host state rather than a dedicated DOM-side SSR hook
- The server rendering pipeline should consume the ordinary host model directly rather than a parallel set of dedicated SSR accessors
- Context providers can remain ordinary host state, while hydration bindings should be treated as hydration-state infrastructure rather than SSR infrastructure
- Dedicated SSR bridge seams such as `resolveSsrRenderBridge()` are migration-only and should disappear from the target host model
- The old instance SSR surface can be removed as soon as the explicit server-pipeline replacement is ready; no compatibility release is required
- The first breaking cut should remove `getHostSsrAttributes()` from the host boundary and move attribute derivation fully into the server pipeline
- The server pipeline may read internal host metadata directly for serialization instead of forcing those details into the public host contract
- Internal SSR metadata reads should be centralized in a small extractor module rather than spread across multiple server call sites
- That extractor should live under `server/` so SSR ownership stays in the server layer rather than drifting back into core
- Server extraction should use one private internal host shape instead of scattered ad hoc casts into host internals
- The private server extraction shape may carry transitional seams temporarily, but those seams remain explicit deletion targets rather than target architecture
- **Render Runtime** is an internal architectural module, not a public library surface
- class names such as `RadiantElement` and `RadiantController` are API spellings, while **Element Host** and **Controller Host** are the glossary concepts
- **Attribute**, **Property**, and **Reactive Property** are distinct concepts and should not be used interchangeably
- the root glossary can name broad concepts like decorators, but specific decorator terms should be added only when they clarify a distinct platform concept
- **Light DOM** and **Shadow DOM** are contrasting concepts, but **Radiant** is explicitly light-DOM-first rather than neutral between them
- **Slot** is the architectural projection boundary; helpers like `@querySlot` are later API details built on top of it
- **Context Provider** and **Context Consumer** are architectural context terms; selector and update decorators are narrower mechanisms built on top of that relationship
- narrower mechanism terms such as context selection stay out of the root glossary unless the project chooses to add the broader decorator taxonomy as well
