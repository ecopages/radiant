# asyncState

Reactive primitive for tracking async operations. Exposes `data`, `status`, and
`error` as dependency-tracked signals so any computed, effect, or
`RadiantComponent.render()` that reads them re-evaluates automatically when the
fetch lifecycle advances.

## API

```typescript
function asyncState<T>(config: AsyncStateConfig<T>): AsyncStateResult<T>;

function asyncState<S, T>(config: AsyncStateSourcedConfig<S, T>): AsyncStateResult<T>;
```

### Config

| Property       | Type                                                    | Default | Description                                                           |
| -------------- | ------------------------------------------------------- | ------- | --------------------------------------------------------------------- |
| `fetcher`      | `(opts) => Promise<T>` / `(source, opts) => Promise<T>` | —       | **Required.** The async function to execute.                          |
| `source`       | `() => S \| false \| null \| undefined`                 | —       | Reactive source. Triggers refetch on change. Falsy = disabled.        |
| `initialValue` | `T`                                                     | —       | Seed value for `data` before the first successful resolution.         |
| `staleTime`    | `number`                                                | `0`     | Milliseconds a response stays fresh. Cache hits skip the network.     |
| `pendingDelay` | `number`                                                | `0`     | Milliseconds to wait before `status` moves to `'pending'`.            |
| `onSuccess`    | `(data: T) => void`                                     | —       | Called after each successful resolution, including cache hits.        |
| `onError`      | `(error: unknown) => void`                              | —       | Called after each failed resolution. Not called for aborted requests. |
| `onSettled`    | `(data: T \| undefined, error: unknown) => void`        | —       | Called after each resolution, whether successful or failed.           |

### `AsyncStateResult<T>`

| Member      | Type                     | Description                                                   |
| ----------- | ------------------------ | ------------------------------------------------------------- |
| `data`      | `Signal<T \| undefined>` | Latest resolved value. Retains last success while refetching. |
| `status`    | `Signal<AsyncStatus>`    | `'idle'` · `'pending'` · `'success'` · `'error'`              |
| `error`     | `Signal<unknown>`        | Latest rejection. Cleared when a new fetch starts.            |
| `refetch()` | `() => void`             | Re-execute, aborting any in-flight request.                   |
| `abort()`   | `() => void`             | Cancel the current request without changing status.           |
| `dispose()` | `() => void`             | Abort + tear down source watcher.                             |

## Usage

### Unsourced (manual)

Fetches immediately on creation. Call `.refetch()` to re-execute.

```typescript
const todos = asyncState({
	fetcher: ({ signal }) => fetch('/api/todos', { signal }).then((r) => r.json()),
});

todos.status.get(); // 'pending' → 'success'
todos.data.get(); // Todo[] | undefined
```

### Sourced (reactive)

Watches a reactive `source`. When it emits a new truthy value the fetcher runs
with that value. Falsy values (`false`, `null`, `undefined`) disable fetching
and preserve the current state — useful for deferred / conditional fetches.

```typescript
const cityId = state('venice');

const weather = asyncState({
	source: () => cityId.get(),
	fetcher: (id, { signal }) => fetchWeather(id, signal),
});

// Changing the source auto-triggers a new fetch:
cityId.set('madrid');
// → previous request aborted, weather.status → 'pending'
```

## Lifecycle

```
[idle] ──▶ refetch() / source change ──▶ [pending]
                                            │
                                ┌───────────┴───────────┐
                                ▼                       ▼
                            [success]               [error]
                                │                       │
                                └───────┬───────────────┘
                                        ▼
                              refetch() / source change ──▶ [pending]
```

### Auto-abort

When a new fetch starts:

1. The previous `AbortController` is aborted.
2. A new controller is created.
3. A version counter increments — only the latest version can commit.
4. `AbortError` exceptions are silently swallowed.

This means rapid source changes (e.g. fast city switching) only resolve the
latest request. Stale responses are discarded automatically.

## Stale-while-revalidate

`data` retains the last successful value while a refetch is in-flight. This
allows UIs to keep showing content with a loading indicator instead of
blanking out.

## Caching with `staleTime`

When `staleTime` is set, successful responses are cached by their serialized
source value. If the source changes back to a previously-fetched key whose
cache entry is still within the stale window, the cached value is served
synchronously — no network request, no pending state.

```typescript
const weather = asyncState({
	source: () => cityId.get(),
	fetcher: (id, { signal }) => fetchWeather(id, signal),
	staleTime: 60_000, // 1 minute
});
```

Set `staleTime: Infinity` to cache forever (useful for data that never
changes within a session). Only sourced queries benefit from caching — the
source value is serialized with `JSON.stringify` to produce the cache key.

## Pending delay with `pendingDelay`

Fast responses should not flash a loading spinner. `pendingDelay` defers
the `'pending'` status transition by N milliseconds. If the response
arrives within that window, `status` jumps straight from its previous value
to `'success'` or `'error'`.

```typescript
const todos = asyncState({
	fetcher: ({ signal }) => fetch('/api/todos', { signal }).then((r) => r.json()),
	pendingDelay: 300,
});

// Fast response (< 300ms):
// status: 'idle' → 'success'  (never shows 'pending')

// Slow response (> 300ms):
// status: 'idle' → 'pending' → 'success'
```

This eliminates the common UX problem of flickery spinners without
introducing artificial slowness. The response is committed as soon as it
arrives — only the loading indicator is delayed.

## Lifecycle callbacks

`onSuccess`, `onError`, and `onSettled` run after each resolution — useful
for side effects like syncing context providers, logging, or toast messages.

```typescript
const weather = asyncState({
	source: () => cityId.get(),
	fetcher: (id, { signal }) => fetchWeather(id, signal),
	onSuccess: (report) => {
		provider.setContext({ activeCityId: report.cityId });
	},
	onError: (err) => {
		console.error('Weather fetch failed', err);
	},
});
```

## Usage in RadiantComponent

Signal reads during `render()` participate in automatic rerender tracking.
No decorator or special integration is needed — just read the signals:

```typescript
@customElement('my-user-card')
class MyUserCard extends RadiantComponent {
  @prop({ type: String }) userId = '';

  private userQuery = asyncState({
    source: () => this.userId || false,
    fetcher: (id, { signal }) => fetchUser(id, signal),
  });

  override disconnectedCallback() {
    this.userQuery.dispose();
    super.disconnectedCallback();
  }

  override render() {
    const status = this.userQuery.status.get();
    const user = this.userQuery.data.get();
    const error = this.userQuery.error.get();

    if (status === 'pending') return <p>Loading...</p>;
    if (status === 'error') return <p>Error: {String(error)}</p>;
    if (!user) return <p>No user selected</p>;

    return <p>{user.name}</p>;
  }
}
```

## Deferred fetch

Pass a falsy initial source to keep the query idle until ready:

```typescript
const trigger = state<string | false>(false);

const report = asyncState({
	source: () => trigger.get(),
	fetcher: (cityId, { signal }) => fetchReport(cityId, signal),
});

// Stays idle until:
trigger.set('venice');
```
