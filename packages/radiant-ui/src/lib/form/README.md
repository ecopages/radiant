# Form logic

State, validation and control bridging for `rui-form` and `rui-field`, kept apart from the custom elements so a host can inject its own store and the elements stay thin. Everything here is plain TypeScript: it imports no element class, so it runs on the server and in tests without a DOM except where a module reads a control.

The element side stays in [`src/components/ui/form`](../../components/ui/form) (`form.script.tsx`, `form.tsx`, `form.css`, stories) and [`src/components/ui/field`](../../components/ui/field). Import this code as `@/lib/form/...`; the public package surface is still `@ecopages/radiant-ui/form`, which re-exports the parts consumers use.

| Module                                      | What it is                                                                                                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `form-state-store.ts`                       | The `FormStateStore<TIssue>` contract a host implements, with its snapshot, `NativeValidity` and write options. Imports nothing outside the package.                                       |
| `form-store.ts`                             | `FormStore`, the built-in store the form creates when none is injected: nested values, validation modes, host errors, native facts. Implements the contract and owns control registration. |
| `form-driver.ts`, `injected-form-driver.ts` | The driver `rui-form` talks to. `FormStore` is one; `InjectedFormDriver` bridges a host store to the registered controls (baselines, facts, rename, reset, flush).                         |
| `store-binding.ts`, `form-handlers.ts`      | `StoreBinding<TIssue>` holds a store with the `formatError`, `submitHandler` and `resetHandler` written for its issue type, and the handler and context types.                             |
| `form-context.ts`                           | `formContext`, the presentation and actions `rui-form` publishes and `rui-field` consumes.                                                                                                 |
| `control-protocol.ts`                       | How a field finds, reads, writes and focuses a control, reads its validity, and which attributes mark the regions. Holds the control adapter registry.                                     |
| `value-path.ts`                             | `getPath`, `setPath`, `deletePath` over dotted paths (`rows.0.title`).                                                                                                                     |
| `resolvers.ts`                              | The rules resolver behind field `rules`.                                                                                                                                                   |
| `types.ts`                                  | `FieldError`, `FieldRules`, `FieldRegistration`, `FieldRegistrationHandle`, resolver and validation types.                                                                                 |

## Boundary with the element

- The element owns the DOM, lifecycle, events and presentation: `rui-form` builds the driver and bindings, publishes `formContext`, handles `submit` and `reset`, and `rui-field` writes ARIA and error regions.
- This directory owns what to store, when to validate, what a control reports, and how a store and its controls stay in step. It never reaches into `rui-form` or `rui-field`; the element passes it registrations, controls and callbacks.
- The control protocol is shared by field, label, input, textarea and form, so it lives here, not under any one component. Module state like the `registerFieldControl` registry must stay on one copy: the library build emits shared modules once into `dist/chunks/`.

Behavior is documented where users read it, in the [form docs page](../../../../../apps/radiant-ui/src/content/components/forms/form.mdx) and the catalog [README](../../components/ui/README.md).
