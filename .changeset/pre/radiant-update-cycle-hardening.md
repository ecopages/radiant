---
'@ecopages/radiant': minor
---

Harden the update cycle and keep framework plumbing off the public host API.

- A removed host no longer stays subscribed to a shared `@signal` source, and server rendering no longer adds subscribers to one. Changes made while a host is detached still run `@onUpdated` once when it reconnects.
- `updateComplete` rejects when an `@onUpdated` callback, render, or `updated()` throws, and the next cycle no longer receives the failed cycle's changes.
- `update()` runs the update cycle on every host, so hosts without `render()` can flush `@onUpdated` and `updated()` synchronously.
- Legacy decorators no longer run `@onUpdated` for a `@state` initializer on first connect, matching standard decorators.
- `RadiantElement` and `RadiantController` no longer expose `notifyUpdate`, `getReactiveBinding` (use `bind`), `registerPostSyncCallback`, `registerUpdatedCallback`, `registerContextProvider`, `registerHydrationBinding`, `getContextProviders`, `getHydrationBindings`, `getSsrContextProviders`, `getSsrHydrationBindings`, `flushPostSyncCallbacks`, or `registerEventEmitter`. Decorators and SSR adapters reach that plumbing through `REACTIVE_HOST`.
