import type { JsxNodeLike } from '../jsx-runtime.ts';

/**
 * Collects all descendant elements of `target` in document order, stopping at
 * custom-element boundaries.
 *
 * Custom elements (tag names containing a hyphen) are treated as opaque hydration
 * islands: their attributes are harvested but their descendants are skipped, since any
 * inner DOM belongs to the custom element's own shadow or light-DOM lifecycle.
 *
 * @param target Root element to walk.
 * @returns Flat array of elements including `target` itself.
 */
export function collectElements(target: HTMLElement): Element[] {
	const elements: Element[] = [];

	const visit = (element: Element, allowDescendIntoChildren: boolean) => {
		elements.push(element);

		if (!allowDescendIntoChildren) {
			return;
		}

		for (const child of Array.from(element.children)) {
			visit(child, !isOpaqueHydrationIsland(child));
		}
	};

	visit(target, true);
	return elements;
}

/**
 * Removes all DOM nodes that sit between `startMarker` and `endMarker` (exclusive).
 *
 * The boundary markers themselves are left in place so the range remains bookmarked
 * for future content.
 *
 * @param startMarker Start boundary text node.
 * @param endMarker End boundary text node.
 */
export function clearRangeBetween(startMarker: Text, endMarker: Text): void {
	const parentNode = startMarker.parentNode;

	if (parentNode && parentNode === endMarker.parentNode) {
		const range = document.createRange();
		range.setStartAfter(startMarker);
		range.setEndBefore(endMarker);
		range.deleteContents();
		return;
	}

	let currentNode = startMarker.nextSibling;

	while (currentNode && currentNode !== endMarker) {
		const nextNode = currentNode.nextSibling;
		currentNode.remove();
		currentNode = nextNode;
	}
}

/**
 * Creates an empty text node used as a lightweight, invisible boundary marker.
 *
 * Empty text nodes are chosen over comment nodes because they have zero visible
 * rendering cost and are easy to distinguish from user-authored content.
 */
export function createBoundaryMarker(): Text {
	return document.createTextNode('');
}

/**
 * Converts a {@link JsxNodeLike} into real DOM nodes.
 *
 * Preference order:
 * 1. `outerHTML` — parsed via a temporary `<template>` element.
 * 2. `nodeType === Node.TEXT_NODE` — creates a text node from `textContent`.
 * 3. `childNodes` array — each child is recursively converted and flattened.
 * 4. `textContent` — single text node fallback.
 *
 * @param value Node-like value to materialize.
 * @returns Array of concrete DOM nodes.
 */
export function createNodesFromJsxNodeLike(value: JsxNodeLike): Node[] {
	if (typeof value.outerHTML === 'string') {
		const template = document.createElement('template');
		template.innerHTML = value.outerHTML;
		return Array.from(template.content.childNodes);
	}

	if (value.nodeType === Node.TEXT_NODE) {
		return [document.createTextNode(value.textContent ?? '')];
	}

	if (Array.isArray(value.childNodes)) {
		return value.childNodes.flatMap((child) => createNodesFromJsxNodeLike(child));
	}

	return value.textContent ? [document.createTextNode(value.textContent)] : [];
}

/**
 * Inserts `nodes` into the DOM immediately before `referenceNode` using a single
 * `DocumentFragment` so that the insertion triggers at most one layout.
 *
 * No-ops when `nodes` is empty.
 *
 * @param referenceNode Node before which the new nodes are inserted.
 * @param nodes Nodes to insert.
 */
export function insertNodesBefore(referenceNode: Node, nodes: readonly Node[]): void {
	if (nodes.length === 0) {
		return;
	}

	const fragment = document.createDocumentFragment();

	for (const node of nodes) {
		fragment.append(node);
	}

	referenceNode.parentNode?.insertBefore(fragment, referenceNode);
}

/**
 * Type guard that narrows `value` to {@link JsxNodeLike}.
 *
 * @param value Value to inspect.
 * @returns `true` when `value` is an object with a `nodeType` property.
 */
export function isJsxNodeLike(value: unknown): value is JsxNodeLike {
	return typeof value === 'object' && value !== null && 'nodeType' in value;
}

/**
 * Moves the entire node range `[start, end]` (inclusive) to immediately before
 * `referenceNode` in a single fragment operation.
 *
 * No-ops when `referenceNode` is already `start` or falls within the range, preventing
 * accidental self-moves in the keyed reconciler.
 *
 * @param start Start boundary text node of the range to move.
 * @param end End boundary text node of the range to move.
 * @param referenceNode Target reference node.
 */
export function moveRangeBefore(start: Text, end: Text, referenceNode: Node): void {
	if (referenceNode === start || isNodeWithinRange(referenceNode, start, end)) {
		return;
	}

	const nodes: Node[] = [];
	let currentNode: Node | null = start;

	while (currentNode) {
		nodes.push(currentNode);

		if (currentNode === end) {
			break;
		}

		currentNode = currentNode.nextSibling;
	}

	if (nodes.length > 0) {
		const parentNode = referenceNode.parentNode;

		if (!parentNode) {
			return;
		}

		const fragment = document.createDocumentFragment();

		for (const node of nodes) {
			fragment.append(node);
		}

		parentNode.insertBefore(fragment, referenceNode);
	}
}

/**
 * Returns `true` when `element` is a custom element that should be treated as an
 * opaque hydration island.
 *
 * Custom elements manage their own internal DOM; the hydrator should not descend
 * into their children to avoid double-applying bindings.
 *
 * @param element Element to test.
 */
function isOpaqueHydrationIsland(element: Element): boolean {
	return element.tagName.includes('-');
}

/**
 * Returns `true` when `target` sits within the sibling range `[start, end]` (inclusive).
 *
 * Used by {@link moveRangeBefore} to guard against moves where the reference node is
 * already inside the range being moved.
 *
 * @param target Node to test.
 * @param start Start boundary of the range.
 * @param end End boundary of the range.
 */
function isNodeWithinRange(target: Node, start: Text, end: Text): boolean {
	let currentNode: Node | null = start;

	while (currentNode) {
		if (currentNode === target) {
			return true;
		}

		if (currentNode === end) {
			return false;
		}

		currentNode = currentNode.nextSibling;
	}

	return false;
}