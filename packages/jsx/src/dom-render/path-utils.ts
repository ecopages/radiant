/**
 * Structural duck-type accepted by path-resolution helpers.
 *
 * Both real DOM `Node` instances and lightweight SSR root shims expose a
 * `childNodes` collection, so helpers that only need to walk child-index paths
 * can accept either without importing DOM globals.
 */
export type NodePathContainer = Node | { childNodes: ArrayLike<Node> };

/**
 * Computes a stable child-index path from `root` to `target`.
 *
 * Compiled templates store part locations as paths so cloned and hydrated trees
 * can resolve the same logical part without relying on object identity.
 */
export function getNodePath(root: Node, target: Node): number[] {
	const path: number[] = [];
	let currentNode: Node | null = target;

	while (currentNode && currentNode !== root) {
		const parentNode: Node | null = currentNode.parentNode;

		if (!parentNode) {
			return path;
		}

		path.unshift(Array.prototype.indexOf.call(parentNode.childNodes, currentNode));
		currentNode = parentNode;
	}

	return path;
}

/** Resolves a previously recorded child-index path back to a concrete node. */
export function getNodeAtPath(root: NodePathContainer, path: readonly number[]): Node | undefined {
	let currentContainer: NodePathContainer = root;
	let currentNode: Node | undefined;

	for (const index of path) {
		currentNode = currentContainer.childNodes[index];

		if (!currentNode) {
			return undefined;
		}

		currentContainer = currentNode;
	}

	return currentNode;
}

/**
 * Serializes a child-index path to a dot-separated string for use as a `Map` key.
 *
 * An empty path (fragment root) serializes to `''`.
 *
 * @param path Array of child indices produced by {@link getNodePath}.
 */
export function getPathKey(path: readonly number[]): string {
	return path.join('.');
}
