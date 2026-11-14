import { describe, expect, it } from 'vitest';
import { reorder, resolveSortIndex, resolveSortKeyIndex, type SortableRect } from './sortable-order';

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

	it('takes the index of the nearest item on both axes', () => {
		const grid: SortableRect[] = [
			{ left: 0, top: 0, width: 50, height: 50 },
			{ left: 50, top: 0, width: 50, height: 50 },
			{ left: 0, top: 50, width: 50, height: 50 },
			{ left: 50, top: 50, width: 50, height: 50 },
		];

		expect(resolveSortIndex(grid, 0, { x: 70, y: 80 }, 'both')).toBe(3);
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
