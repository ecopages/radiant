import { Computed } from './computed';
import { untrack } from './tracking';
import type { Signal, SignalOptions } from './types';

/** A list signal, or a function that reads one, for {@link mapItems}. */
export type MapItemsSource<Item> = Signal<readonly Item[]> | (() => readonly Item[]);

/**
 * Maps each item of a list signal once, and reuses that item's result while it stays in the list.
 *
 * @param source The list, as a signal or a function that reads signals.
 * @param project Called once per item, the first time the item appears.
 * @returns A computed holding the mapped list, in the source's order.
 *
 * @remarks Results are kept by item identity, so moving, removing or adding items only projects the items that are
 * new; the others keep the very same result object. A renderer can then skip them: `@ecopages/jsx` leaves a keyed
 * row alone when its value is the object it rendered last. An item that leaves the list drops its result, and one
 * that comes back is projected again. An item that appears twice shares one result.
 *
 * `project` runs untracked: the computed depends on the source alone, so a result that reads its item's own signals
 * does not re-map the list when they change. To react to those changes, put the signals themselves in the result,
 * such as a signal bound in JSX.
 *
 * @example
 * ```tsx
 * const rows = mapItems(model.rows, (row) => <tr key={row.id}>{row.label}</tr>);
 * root.render(<tbody>{rows}</tbody>);
 * ```
 */
export function mapItems<Item, Result>(
	source: MapItemsSource<Item>,
	project: (item: Item) => Result,
	options?: SignalOptions<Result[]>,
): Computed<Result[]> {
	const read = typeof source === 'function' ? source : () => source.get();
	let results = new Map<Item, Result>();

	return new Computed(() => {
		const items = read();
		const next = new Map<Item, Result>();
		const mapped = Array.from(items, (item) => {
			let result = next.get(item);

			if (result === undefined && !next.has(item)) {
				result = results.has(item) ? (results.get(item) as Result) : untrack(() => project(item));
				next.set(item, result);
			}

			return result as Result;
		});

		results = next;
		return mapped;
	}, options);
}
