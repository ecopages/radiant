import { describe, expect, it } from 'vitest';
import { wrapCollectionIndex } from './collection-index';

describe('wrapCollectionIndex', () => {
	it('wraps navigation in either direction', () => {
		expect(wrapCollectionIndex(2, 1, 3)).toBe(0);
		expect(wrapCollectionIndex(0, -1, 3)).toBe(2);
		expect(wrapCollectionIndex(0, 1, 0)).toBe(-1);
	});
});
