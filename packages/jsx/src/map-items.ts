import { isKeyedJsxValue, isSubscribableJsxValue } from './types/renderable-guards.ts';
import { KEYED_VALUE_SYMBOL, SUBSCRIBABLE_JSX_VALUE_SYMBOL } from './types/index.ts';
import type { JsxKey, JsxRenderable, KeyedJsxValue, SignalLike, SubscribableJsxValue } from './types/index.ts';

/** A list signal or subscribable, for {@link MapItems}. */
export type MapItemsSource<Item> = SignalLike<readonly Item[]> | SubscribableJsxValue<readonly Item[]>;

export type MapItemsProps<Item> = {
	/** The list. A signal, so the rows it renders can be kept across renders of the view around it. */
	each: MapItemsSource<Item>;
	/** Renders one item; called once per item, the first time it appears. */
	children: (item: Item) => JsxRenderable;
};

type MapItemsState<Item> = {
	binding: JsxRenderable;
	project: (item: Item) => JsxRenderable;
	rows: Map<Item, JsxRenderable>;
};

/** One state per list signal, so a view that renders again finds the rows it already built. */
const MAP_ITEMS_STATES = new WeakMap<object, MapItemsState<unknown>>();

/**
 * Renders each item of a list signal once, and reuses that row while the item stays in the list: the JSX form of
 * `mapItems` from `@ecopages/signals`.
 *
 * @remarks Rows are kept by item identity. When the list changes, only new items are rendered; the others return the
 * very same row, which the renderer skips, so a swap or a removal touches only the rows that moved or left. A row
 * without a `key` is keyed by its item, so it keeps its nodes when it moves.
 *
 * The state lives with the `each` signal, not with the element, so a view that renders again (a Radiant host's
 * `render()`, or a second `root.render(...)`) keeps the same rows and subscription. A new `children` function applies
 * to items that appear after it. Items are rendered when the list notifies, outside the computation that created the
 * view, so reading an item's signals in `children` does not subscribe the view to them; bind the signals in the row
 * instead to keep them live.
 *
 * @example
 * ```tsx
 * <tbody>
 *   <MapItems each={rows}>{(row) => <tr>{row.label}</tr>}</MapItems>
 * </tbody>
 * ```
 */
export function MapItems<Item>(props: MapItemsProps<Item>): JsxRenderable {
	let state = MAP_ITEMS_STATES.get(props.each) as MapItemsState<Item> | undefined;

	if (!state) {
		const created: MapItemsState<Item> = { binding: null, project: props.children, rows: new Map() };
		created.binding = createRowsBinding(props.each, (items) => renderRows(created, items));
		MAP_ITEMS_STATES.set(props.each, created as MapItemsState<unknown>);
		state = created;
	}

	state.project = props.children;
	return state.binding;
}

/** The rows as a subscribable child the renderer mounts and follows. */
function createRowsBinding<Item>(
	source: MapItemsSource<Item>,
	render: (items: readonly Item[]) => JsxRenderable,
): JsxRenderable {
	const read: () => readonly Item[] = isSubscribableJsxValue(source)
		? () => (source as SubscribableJsxValue<readonly Item[]>).getValue()
		: () => (source as SignalLike<readonly Item[]>).get();

	return {
		[SUBSCRIBABLE_JSX_VALUE_SYMBOL]: true,
		getValue: () => render(read()),
		subscribe: (notify: (value: JsxRenderable) => void) => source.subscribe((items) => notify(render(items))),
	} as unknown as SubscribableJsxValue<JsxRenderable>;
}

function renderRows<Item>(state: MapItemsState<Item>, items: readonly Item[]): JsxRenderable {
	const rows = new Map<Item, JsxRenderable>();
	const rendered = Array.from(items, (item) => {
		let row = rows.get(item);

		if (row === undefined) {
			row = state.rows.get(item) ?? keyRow(item, state.project(item));
			rows.set(item, row);
		}

		return row;
	});

	state.rows = rows;
	return rendered;
}

/**
 * @remarks A row the author keyed keeps its key. Any other row is keyed by its item itself: the renderer keeps keyed
 * records in a `Map`, so an object key costs no string, and it cannot equal an author's string or number key.
 */
function keyRow<Item>(item: Item, row: JsxRenderable): JsxRenderable {
	if (isKeyedJsxValue(row)) return row;
	return { key: item as unknown as JsxKey, value: row, [KEYED_VALUE_SYMBOL]: true } satisfies KeyedJsxValue;
}
