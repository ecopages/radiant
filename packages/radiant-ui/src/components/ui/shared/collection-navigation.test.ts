import { describe, expect, it } from 'vitest';
import { getVisibleCollectionOptions, wrapCollectionIndex } from './collection-navigation';

describe('collection navigation', () => {
	it('filters hidden and disabled options', () => {
		const visible = document.createElement('div');
		const hidden = document.createElement('div');
		hidden.hidden = true;
		const disabled = document.createElement('div');
		disabled.setAttribute('aria-disabled', 'true');

		expect(getVisibleCollectionOptions([visible, hidden, disabled])).toEqual([visible]);
	});

	it('wraps navigation in either direction', () => {
		expect(wrapCollectionIndex(2, 1, 3)).toBe(0);
		expect(wrapCollectionIndex(0, -1, 3)).toBe(2);
		expect(wrapCollectionIndex(0, 1, 0)).toBe(-1);
	});
});
