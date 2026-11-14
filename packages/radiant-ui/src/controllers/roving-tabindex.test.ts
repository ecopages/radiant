import { afterEach, describe, expect, it } from 'vitest';
import { applyRovingTabindex, focusRovingItem, navigateRovingTabindex } from './roving-tabindex';

function makeItems(count: number): HTMLElement[] {
	const items = Array.from({ length: count }, () => document.createElement('button'));
	document.body.append(...items);
	return items;
}

describe('roving-tabindex', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it('applyRovingTabindex makes exactly one item tabbable', () => {
		const items = makeItems(3);
		applyRovingTabindex(items, 1);
		expect(items.map((item) => item.tabIndex)).toEqual([-1, 0, -1]);
	});

	it('focusRovingItem clamps the index, focuses and moves the tab stop', () => {
		const items = makeItems(3);
		expect(focusRovingItem(items, 9)).toBe(items[2]);
		expect(document.activeElement).toBe(items[2]);
		expect(items.map((item) => item.tabIndex)).toEqual([-1, -1, 0]);
		expect(focusRovingItem([], 0)).toBeNull();
	});

	it('navigates by the arrows of its orientation and ignores the other axis', () => {
		const items = makeItems(3);
		const horizontal = navigateRovingTabindex({ items, current: items[0], key: 'ArrowRight' });
		expect(horizontal).toEqual({ handled: true, index: 1, item: items[1] });
		expect(navigateRovingTabindex({ items, current: items[1], key: 'ArrowDown' })).toEqual({ handled: false });

		const vertical = navigateRovingTabindex({
			items,
			current: items[1],
			key: 'ArrowDown',
			orientation: 'vertical',
		});
		expect(vertical).toMatchObject({ handled: true, index: 2 });
		expect(
			navigateRovingTabindex({ items, current: items[1], key: 'ArrowRight', orientation: 'vertical' }),
		).toEqual({ handled: false });
	});

	it('wraps by default and stops at the ends without wrap', () => {
		const items = makeItems(3);
		expect(navigateRovingTabindex({ items, current: items[2], key: 'ArrowRight' })).toMatchObject({ index: 0 });
		expect(navigateRovingTabindex({ items, current: items[0], key: 'ArrowLeft' })).toMatchObject({ index: 2 });
		expect(navigateRovingTabindex({ items, current: items[2], key: 'ArrowRight', wrap: false })).toMatchObject({
			index: 2,
		});
		expect(navigateRovingTabindex({ items, current: items[0], key: 'ArrowLeft', wrap: false })).toMatchObject({
			index: 0,
		});
	});

	it('jumps to the ends with Home and End and ignores other keys or unknown items', () => {
		const items = makeItems(3);
		expect(navigateRovingTabindex({ items, current: items[1], key: 'End' })).toMatchObject({ index: 2 });
		expect(navigateRovingTabindex({ items, current: items[1], key: 'Home' })).toMatchObject({ index: 0 });
		expect(navigateRovingTabindex({ items, current: items[1], key: 'a' })).toEqual({ handled: false });
		expect(navigateRovingTabindex({ items, current: null, key: 'Home' })).toEqual({ handled: false });
		expect(navigateRovingTabindex({ items, current: document.createElement('i'), key: 'Home' })).toEqual({
			handled: false,
		});
		expect(navigateRovingTabindex({ items: [], current: items[0], key: 'Home' })).toEqual({ handled: false });
	});
});
