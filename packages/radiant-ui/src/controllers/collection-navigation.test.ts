import { describe, expect, it } from 'vitest';
import { getVisibleCollectionOptions, setCollectionActive } from './collection-navigation';

describe('collection navigation', () => {
	it('filters hidden and disabled options', () => {
		const visible = document.createElement('div');
		const hidden = document.createElement('div');
		hidden.hidden = true;
		const disabled = document.createElement('div');
		disabled.setAttribute('aria-disabled', 'true');

		expect(getVisibleCollectionOptions([visible, hidden, disabled])).toEqual([visible]);
	});

	it('gives options unique ids that survive filtering', () => {
		const host = document.createElement('input');
		const first = document.createElement('div');
		const second = document.createElement('div');
		const options = [first, second];
		document.body.append(host, first, second);

		setCollectionActive(options, getVisibleCollectionOptions(options), 0, host, 'opt');
		const firstId = first.id;
		first.hidden = true;
		const visible = getVisibleCollectionOptions(options);
		setCollectionActive(options, visible, 0, host, 'opt');

		expect(second.id).not.toBe(firstId);
		expect(host.getAttribute('aria-activedescendant')).toBe(second.id);
		expect(first.id).toBe(firstId);
		setCollectionActive(options, visible, 0, host, 'opt');
		expect(second.id).toBe(host.getAttribute('aria-activedescendant'));
		document.body.replaceChildren();
	});
});
