import { describe, expect, it } from 'vitest';
import { deletePath, getPath, setPath } from './value-path';

describe('value paths', () => {
	it('reads nested and missing branches', () => {
		const tree = { a: { b: [{ c: 1 }] }, flat: 2 };

		expect(getPath(tree, 'a.b.0.c')).toBe(1);
		expect(getPath(tree, 'flat')).toBe(2);
		expect(getPath(tree, 'a.x.y')).toBeUndefined();
		expect(getPath(tree, 'flat.deeper')).toBeUndefined();
	});

	it('writes immutably, creating objects and arrays for numeric segments', () => {
		const tree = { keep: { same: true } };
		const next = setPath(tree, 'rows.0.name', 'Ada') as Record<string, unknown>;

		expect(next).toEqual({ keep: { same: true }, rows: [{ name: 'Ada' }] });
		expect(next.keep).toBe(tree.keep);
		expect(tree).toEqual({ keep: { same: true } });
	});

	it('replaces the branch at a path', () => {
		expect(setPath({ a: { b: 1, c: 2 } }, 'a', { d: 3 })).toEqual({ a: { d: 3 } });
	});

	it('deletes a leaf without touching siblings and is a no-op for a missing path', () => {
		const tree = { a: { b: 1, c: 2 } };

		expect(deletePath(tree, 'a.b')).toEqual({ a: { c: 2 } });
		expect(deletePath(tree, 'a.x.y')).toBe(tree);
	});
});
