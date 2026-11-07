# JSX with signals, without a host

`@ecopages/jsx` renders on its own with `createRoot(...)` and reads signals directly. Use this when a page or widget needs no custom-element host.

## Render once

Mount the view once and let signals carry every later change. Do not call `root.render(...)` on each state change: that rebuilds and compares the whole tree, and is only worth it for small or rarely changing views.

```tsx
/** @jsxImportSource @ecopages/jsx */
import { computed, state, type State } from '@ecopages/signals';
import { createRoot } from '@ecopages/jsx/client';

type Row = { id: number; label: State<string>; cls: State<string> };

const rows = state<Row[]>([]);
const list = computed(() =>
	rows.get().map((row) => (
		<tr key={row.id} class={row.cls}>
			<td>{row.id}</td>
			<td>{row.label}</td>
		</tr>
	)),
);

createRoot(document.querySelector('#app') as HTMLElement).render(
	<table>
		<tbody>{list}</tbody>
	</table>,
);
```

## Rules

- A signal (anything with `get()` and `subscribe(...)`) works as a child and as any attribute value: `class`, `classes`, `attr:`, `bool:`, `prop:`, `data-*`, `aria-*`. The renderer patches only that text node or attribute.
- In `class` and `classes`, a signal's value is normalized like a static one: a string, a list or a class map.
- A list is a `computed` that maps a signal of rows to keyed JSX. It rebuilds only when the list signal changes; keyed rows keep their nodes.
- Give each row the signals that change per row (label, selection class) and pass them into the row's JSX.
- Pass the signal, never `signal.get()`, inside JSX a `computed` builds: reading a value there makes the whole list depend on it, so one row's change rebuilds every row.
- Keep the header and other static parts out of the `computed`, so a list change rebuilds only the rows.
- Delegate row events: one `on:click` on the list container, reading the row from `event.target.closest(...)`, instead of a handler per row.
- For a source with its own notifications but no `get()`/`subscribe(...)`, wrap it with `createSubscribableJsxValue({ getValue, subscribe })`.
- Install `@ecopages/signals` explicitly: `@ecopages/jsx` lists it as a peer dependency.

## Inside a Radiant host

A `RadiantElement` uses the same renderer, so a host's `render()` can return a view built this way. Inside a host, prefer the host model from the main skill: plain reads for render logic, `this.$.name` bindings for leaves, and `@signal` / `@state` fields over loose module signals.
