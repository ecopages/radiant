import { DOM_RANGE_ANCHOR_DRIFT_WARNING, warnRuntime } from '../warnings/dev-warnings.ts';
import { clearRangeBetween, insertNodesBefore } from './dom-operations.ts';
import type { ChildRange } from './types.ts';

/** Returns the parent that holds a range's content. */
export function getRangeParent(range: ChildRange): ParentNode | null {
	return range.start?.parentNode ?? range.end?.parentNode ?? range.owner ?? null;
}

/** Returns the first node of a range's content, or `null` when it is empty. */
export function getRangeFirstNode(range: ChildRange): ChildNode | null {
	const first = range.start ? range.start.nextSibling : (getRangeParent(range)?.firstChild ?? null);
	return first === range.end ? null : first;
}

/** Removes a range's content and keeps its bounds; warns and removes nothing when its markers left the DOM. */
export function clearRange(range: ChildRange): void {
	if (range.start && range.end) {
		clearRangeBetween(range.start, range.end);
		return;
	}

	const parent = getRangeParent(range);

	if (!parent) {
		if (range.start || range.end) {
			warnRuntime(DOM_RANGE_ANCHOR_DRIFT_WARNING, 'clearRangeBetween', { code: 'dom-range-anchor-drift:clear' });
		}
		return;
	}

	if (!range.start && !range.end) {
		parent.textContent = '';
		return;
	}

	let node = range.start ? range.start.nextSibling : parent.firstChild;

	while (node && node !== range.end) {
		const next = node.nextSibling;
		parent.removeChild(node);
		node = next;
	}
}

/** Inserts `nodes` at the end of a range's content. */
export function insertIntoRange(range: ChildRange, nodes: readonly Node[]): void {
	if (range.end) {
		insertNodesBefore(range.end, nodes);
		return;
	}

	const parent = getRangeParent(range);

	if (!parent || nodes.length === 0) {
		return;
	}

	if (nodes.length === 1) {
		parent.insertBefore(nodes[0]!, null);
		return;
	}

	const fragment = document.createDocumentFragment();
	for (const node of nodes) fragment.append(node);
	parent.insertBefore(fragment, null);
}
