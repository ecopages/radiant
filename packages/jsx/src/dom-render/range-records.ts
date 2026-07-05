import { createBoundaryMarker } from './dom-operations.ts';
import type { MountedRangeRecord } from './types.ts';

/**
 * Allocates a new empty {@link MountedRangeRecord} with fresh boundary markers
 * inserted immediately before `referenceNode`.
 *
 * @param referenceNode Node before which the new boundary pair is inserted.
 */
export function createRangeRecord(referenceNode: Text): MountedRangeRecord {
	const start = createBoundaryMarker();
	const end = createBoundaryMarker();
	referenceNode.before(start, end);
	return {
		end,
		mounted: { kind: 'empty' },
		start,
	};
}

/**
 * Wraps an existing slice of SSR DOM nodes in a {@link MountedRangeRecord} by
 * inserting boundary markers around them.
 *
 * When `existingNodes` is empty, both markers are inserted before `referenceNode`.
 * Otherwise, the start marker is placed before the first node and the end marker after
 * the last node.
 *
 * @param existingNodes SSR nodes to enclose.
 * @param referenceNode Fallback reference node used for empty slices.
 */
export function createHydratedRangeRecord(existingNodes: readonly Node[], referenceNode: Node): MountedRangeRecord {
	const start = createBoundaryMarker();
	const end = createBoundaryMarker();
	const parentNode = (existingNodes[0] ?? referenceNode).parentNode;

	if (!parentNode) {
		return {
			end,
			mounted: { kind: 'empty' },
			start,
		};
	}

	if (existingNodes.length === 0) {
		parentNode.insertBefore(start, referenceNode);
		parentNode.insertBefore(end, referenceNode);
	} else {
		parentNode.insertBefore(start, existingNodes[0] ?? null);
		parentNode.insertBefore(
			end,
			(existingNodes[existingNodes.length - 1]?.nextSibling ?? referenceNode) as ChildNode | null,
		);
	}

	return {
		end,
		mounted: { kind: 'empty' },
		start,
	};
}
