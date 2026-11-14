import { describe, expect, it } from 'vitest';
import { getVisibleCollectionOptions } from './collection-navigation';

describe('collection navigation', () => {
	it('filters hidden and disabled options', () => {
		const visible = document.createElement('div');
		const hidden = document.createElement('div');
		hidden.hidden = true;
		const disabled = document.createElement('div');
		disabled.setAttribute('aria-disabled', 'true');

		expect(getVisibleCollectionOptions([visible, hidden, disabled])).toEqual([visible]);
	});
});
