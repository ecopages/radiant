import { describe, expect, it } from 'vitest';
import { pickReturnTarget, resolveTrapEdge, resolveTrapMove } from './focus-trap-order';

describe('resolveTrapMove', () => {
	const items = ['a', 'b', 'c'];

	it('wraps Tab from the last item to the first', () => {
		expect(resolveTrapMove(items, 'c', false, false)).toEqual({ kind: 'item', item: 'a' });
	});

	it('wraps Shift+Tab from the first item to the last', () => {
		expect(resolveTrapMove(items, 'a', true, false)).toEqual({ kind: 'item', item: 'c' });
	});

	it('leaves a move between two items to the browser', () => {
		expect(resolveTrapMove(items, 'a', false, false)).toEqual({ kind: 'native' });
		expect(resolveTrapMove(items, 'c', true, false)).toEqual({ kind: 'native' });
		expect(resolveTrapMove(items, 'b', false, false)).toEqual({ kind: 'native' });
	});

	it('keeps focus on the surface when nothing can take it', () => {
		expect(resolveTrapMove([], 'x', false, false)).toEqual({ kind: 'surface' });
		expect(resolveTrapMove([], 'x', true, true)).toEqual({ kind: 'surface' });
	});

	it('leaves an active item outside the loop to the browser, unless strict', () => {
		expect(resolveTrapMove(items, 'x', false, false)).toEqual({ kind: 'native' });
		expect(resolveTrapMove(items, 'x', true, false)).toEqual({ kind: 'native' });
		expect(resolveTrapMove(items, 'x', false, true)).toEqual({ kind: 'item', item: 'a' });
		expect(resolveTrapMove(items, 'x', true, true)).toEqual({ kind: 'item', item: 'c' });
	});

	it('wraps a single item onto itself in both directions', () => {
		expect(resolveTrapMove(['a'], 'a', false, false)).toEqual({ kind: 'item', item: 'a' });
		expect(resolveTrapMove(['a'], 'a', true, false)).toEqual({ kind: 'item', item: 'a' });
	});
});

describe('resolveTrapEdge', () => {
	it('picks the first or last item, and the surface when there are none', () => {
		expect(resolveTrapEdge(['a', 'b', 'c'], 'first')).toEqual({ kind: 'item', item: 'a' });
		expect(resolveTrapEdge(['a', 'b', 'c'], 'last')).toEqual({ kind: 'item', item: 'c' });
		expect(resolveTrapEdge([], 'last')).toEqual({ kind: 'surface' });
	});
});

describe('pickReturnTarget', () => {
	const usable = (item: string) => item !== 'gone';

	it('prefers the chosen element while it is usable', () => {
		expect(pickReturnTarget('chosen', 'remembered', usable)).toBe('chosen');
	});

	it('falls back to the remembered element when nothing is chosen or the choice is unusable', () => {
		expect(pickReturnTarget(null, 'remembered', usable)).toBe('remembered');
		expect(pickReturnTarget('gone', 'remembered', usable)).toBe('remembered');
		expect(pickReturnTarget(null, null, usable)).toBeNull();
	});
});
