import { describe, expect, it } from 'vitest';
import {
	findRectIndex,
	reorder,
	resolveContainerKeyIndex,
	resolveInsertIndex,
	resolveSortIndex,
	resolveSortKeyIndex,
	type SortableRect,
} from './sortable-order';

const column = (count: number): SortableRect[] =>
	Array.from({ length: count }, (_, index) => ({ left: 0, top: index * 20, width: 100, height: 20 }));

describe('resolveSortIndex', () => {
	it('keeps the index while the pointer is over the dragged item', () => {
		expect(resolveSortIndex(column(4), 1, { x: 10, y: 30 })).toBe(1);
	});

	it('counts the other midpoints the pointer has passed, going down', () => {
		expect(resolveSortIndex(column(4), 0, { x: 10, y: 55 })).toBe(2);
		expect(resolveSortIndex(column(4), 0, { x: 10, y: 79 })).toBe(3);
	});

	it('counts them going up and stops at the start', () => {
		expect(resolveSortIndex(column(4), 3, { x: 10, y: 25 })).toBe(1);
		expect(resolveSortIndex(column(4), 3, { x: 10, y: -50 })).toBe(0);
	});

	it('does not move before the midpoint of a neighbour', () => {
		expect(resolveSortIndex(column(3), 0, { x: 0, y: 29 })).toBe(0);
		expect(resolveSortIndex(column(3), 0, { x: 0, y: 31 })).toBe(1);
	});

	it('reads x on the horizontal axis', () => {
		const row = column(3).map((rect, index) => ({ ...rect, left: index * 100, top: 0 }));

		expect(resolveSortIndex(row, 0, { x: 260, y: 500 }, 'horizontal')).toBe(2);
		expect(resolveSortIndex(row, 2, { x: 40, y: 0 }, 'horizontal')).toBe(0);
	});

	it('ignores the dragged rect on both axes, so a translated item does not pin itself', () => {
		const grid: SortableRect[] = [
			{ left: 70, top: 80, width: 50, height: 50 },
			{ left: 50, top: 0, width: 50, height: 50 },
			{ left: 0, top: 50, width: 50, height: 50 },
		];

		expect(resolveSortIndex(grid, 0, { x: 90, y: 100 }, 'both')).toBe(2);
		expect(resolveSortIndex(grid, 2, { x: 70, y: 20 }, 'both')).toBe(1);
	});

	it('lands before or after the nearest item on both axes, by which side of its center the pointer is', () => {
		const grid: SortableRect[] = [
			{ left: 0, top: 0, width: 50, height: 50 },
			{ left: 50, top: 0, width: 50, height: 50 },
			{ left: 0, top: 50, width: 50, height: 50 },
			{ left: 50, top: 50, width: 50, height: 50 },
		];

		expect(resolveSortIndex(grid, 0, { x: 80, y: 80 }, 'both')).toBe(3);
		expect(resolveSortIndex(grid, 0, { x: 70, y: 80 }, 'both')).toBe(2);
		expect(resolveSortIndex(grid, 3, { x: 10, y: 10 }, 'both')).toBe(0);
	});
});

describe('resolveSortKeyIndex', () => {
	it('moves one step on the arrows of the axis and clamps at the ends', () => {
		expect(resolveSortKeyIndex('ArrowDown', 1, 4)).toBe(2);
		expect(resolveSortKeyIndex('ArrowUp', 1, 4)).toBe(0);
		expect(resolveSortKeyIndex('ArrowUp', 0, 4)).toBe(0);
		expect(resolveSortKeyIndex('ArrowDown', 3, 4)).toBe(3);
	});

	it('ignores the arrows of the other axis', () => {
		expect(resolveSortKeyIndex('ArrowRight', 1, 4, 'vertical')).toBeNull();
		expect(resolveSortKeyIndex('ArrowDown', 1, 4, 'horizontal')).toBeNull();
		expect(resolveSortKeyIndex('ArrowRight', 1, 4, 'horizontal')).toBe(2);
		expect(resolveSortKeyIndex('ArrowLeft', 1, 4, 'horizontal')).toBe(0);
	});

	it('reads all four arrows for both', () => {
		expect(resolveSortKeyIndex('ArrowRight', 1, 4, 'both')).toBe(2);
		expect(resolveSortKeyIndex('ArrowUp', 1, 4, 'both')).toBe(0);
	});

	it('jumps to the ends on Home and End and ignores other keys', () => {
		expect(resolveSortKeyIndex('Home', 2, 4)).toBe(0);
		expect(resolveSortKeyIndex('End', 1, 4)).toBe(3);
		expect(resolveSortKeyIndex('a', 1, 4)).toBeNull();
	});
});

describe('reorder', () => {
	it('moves an item forward and back without touching the input', () => {
		const input = ['a', 'b', 'c', 'd'];

		expect(reorder(input, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
		expect(reorder(input, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
		expect(input).toEqual(['a', 'b', 'c', 'd']);
	});
});

describe('resolveInsertIndex', () => {
	it('counts the midpoints passed, from 0 to the number of items', () => {
		expect(resolveInsertIndex(column(3), { x: 0, y: 5 })).toBe(0);
		expect(resolveInsertIndex(column(3), { x: 0, y: 35 })).toBe(2);
		expect(resolveInsertIndex(column(3), { x: 0, y: 500 })).toBe(3);
	});

	it('is 0 for an empty list on every axis', () => {
		expect(resolveInsertIndex([], { x: 5, y: 5 })).toBe(0);
		expect(resolveInsertIndex([], { x: 5, y: 5 }, 'both')).toBe(0);
	});

	it('can land after the last item on both axes', () => {
		const grid: SortableRect[] = [
			{ left: 0, top: 0, width: 50, height: 50 },
			{ left: 50, top: 0, width: 50, height: 50 },
		];

		expect(resolveInsertIndex(grid, { x: 90, y: 20 }, 'both')).toBe(2);
		expect(resolveInsertIndex(grid, { x: 60, y: 20 }, 'both')).toBe(1);
		expect(resolveInsertIndex(grid, { x: 70, y: 90 }, 'both')).toBe(2);
	});
});

describe('findRectIndex', () => {
	it('returns the index of the rect that holds the point, or -1', () => {
		const rects: SortableRect[] = [
			{ left: 0, top: 0, width: 100, height: 100 },
			{ left: 200, top: 0, width: 100, height: 100 },
		];

		expect(findRectIndex(rects, { x: 250, y: 50 })).toBe(1);
		expect(findRectIndex(rects, { x: 150, y: 50 })).toBe(-1);
	});
});

describe('resolveContainerKeyIndex', () => {
	it('moves to the next or previous container and clamps', () => {
		expect(resolveContainerKeyIndex('PageDown', 0, 3)).toBe(1);
		expect(resolveContainerKeyIndex('PageDown', 2, 3)).toBe(2);
		expect(resolveContainerKeyIndex('PageUp', 1, 3)).toBe(0);
		expect(resolveContainerKeyIndex('PageUp', 0, 3)).toBe(0);
		expect(resolveContainerKeyIndex('ArrowDown', 0, 3)).toBeNull();
	});
});
