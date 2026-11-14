import { afterEach, describe, expect, it, vi } from 'vitest';
import { RovingController, createRovingController, type RovingControllerConfig } from './roving-controller';

describe('RovingController on plain elements', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	function mount(config: Partial<RovingControllerConfig> = {}, count = 3) {
		const root = document.createElement('div');
		const items = Array.from({ length: count }, (_, index) => {
			const item = document.createElement('button');
			item.textContent = String(index);
			return item;
		});
		const outside = document.createElement('button');
		root.append(...items);
		document.body.append(root, outside);
		const controller = new RovingController({
			getItems: () => items,
			getTarget: () => root,
			...config,
		});
		return { root, items, outside, controller };
	}

	const press = (target: Element, key: string) => {
		const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
		target.dispatchEvent(event);
		return event;
	};
	const tabStops = (items: HTMLElement[]) => items.map((item) => item.tabIndex);

	it('makes one item tabbable on sync, the first by default', () => {
		const { items, controller } = mount();

		expect(controller.sync()).toBe(items[0]);
		expect(tabStops(items)).toEqual([0, -1, -1]);
		expect(controller.getActive()).toBe(items[0]);
	});

	it('syncs to the preferred item, then keeps it while it stays an item', () => {
		const { items, controller } = mount();

		controller.sync(items[2]);
		expect(tabStops(items)).toEqual([-1, -1, 0]);

		controller.sync();
		expect(tabStops(items)).toEqual([-1, -1, 0]);

		controller.sync(document.createElement('button'));
		expect(controller.getActive()).toBe(items[2]);
	});

	it('falls back to the first item when the active one leaves the collection', () => {
		const { items } = mount();
		const live = [...items];
		const dynamic = new RovingController({ getItems: () => live, getTarget: () => document.body });
		dynamic.sync(items[1]);

		live.splice(1, 1);
		expect(dynamic.sync()).toBe(items[0]);
		expect(tabStops([items[0], items[2]])).toEqual([0, -1]);
	});

	it('returns null when there are no items', () => {
		const { controller } = mount({ getItems: () => [] });

		expect(controller.sync()).toBeNull();
		expect(controller.getActive()).toBeNull();
	});

	it('moves focus and the tab stop with the arrows of its orientation and prevents default', () => {
		const { items, controller } = mount();
		controller.attach();
		controller.sync();

		const event = press(items[0], 'ArrowRight');

		expect(event.defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(items[1]);
		expect(tabStops(items)).toEqual([-1, 0, -1]);
		expect(controller.getActive()).toBe(items[1]);
		controller.destroy();
	});

	it('leaves arrows of the other axis alone', () => {
		const { items, controller } = mount();
		controller.attach();
		controller.sync();

		expect(press(items[0], 'ArrowDown').defaultPrevented).toBe(false);
		expect(controller.getActive()).toBe(items[0]);
		controller.destroy();
	});

	it('uses the vertical axis when asked', () => {
		const { items, controller } = mount({ orientation: 'vertical' });
		controller.attach();
		controller.sync();

		press(items[0], 'ArrowDown');
		expect(document.activeElement).toBe(items[1]);
		expect(press(items[1], 'ArrowRight').defaultPrevented).toBe(false);
		controller.destroy();
	});

	it('wraps by default and stops at the ends with wrap false', () => {
		const wrapping = mount();
		wrapping.controller.attach();
		wrapping.controller.sync(wrapping.items[2]);
		press(wrapping.items[2], 'ArrowRight');
		expect(document.activeElement).toBe(wrapping.items[0]);
		wrapping.controller.destroy();

		const clamped = mount({ wrap: false });
		clamped.controller.attach();
		clamped.controller.sync(clamped.items[2]);
		clamped.items[2].focus();
		press(clamped.items[2], 'ArrowRight');
		expect(document.activeElement).toBe(clamped.items[2]);
		clamped.controller.destroy();
	});

	it('jumps to the first and last item with Home and End', () => {
		const { items, controller } = mount();
		controller.attach();
		controller.sync();

		press(items[0], 'End');
		expect(document.activeElement).toBe(items[2]);
		press(items[2], 'Home');
		expect(document.activeElement).toBe(items[0]);
		controller.destroy();
	});

	it('resolves a key pressed inside an item and ignores one outside the items', () => {
		const { root, items, controller } = mount();
		const icon = document.createElement('span');
		items[0].append(icon);
		const stray = document.createElement('input');
		root.append(stray);
		controller.attach();
		controller.sync();

		press(icon, 'ArrowRight');
		expect(document.activeElement).toBe(items[1]);

		expect(press(stray, 'ArrowRight').defaultPrevented).toBe(false);
		expect(controller.getActive()).toBe(items[1]);
		controller.destroy();
	});

	it('reads the items on every key, so added items join the navigation', () => {
		const { root, items } = mount();
		const live = [items[0], items[1]];
		const controller = new RovingController({ getItems: () => live, getTarget: () => root });
		controller.attach();
		controller.sync();

		live.push(items[2]);
		press(items[1], 'ArrowRight');
		expect(document.activeElement).toBe(items[2]);
		controller.destroy();
	});

	it('ignores keys while enabled returns false', () => {
		let enabled = false;
		const { items, controller } = mount({ enabled: () => enabled });
		controller.attach();
		controller.sync();

		expect(press(items[0], 'ArrowRight').defaultPrevented).toBe(false);
		expect(controller.getActive()).toBe(items[0]);

		enabled = true;
		press(items[0], 'ArrowRight');
		expect(controller.getActive()).toBe(items[1]);
		controller.destroy();
	});

	it('reports the moved-to item and the event through onMove, and not for an unhandled key', () => {
		const onMove = vi.fn();
		const { items, controller } = mount({ onMove });
		controller.attach();
		controller.sync();

		press(items[0], 'a');
		expect(onMove).not.toHaveBeenCalled();

		press(items[0], 'ArrowRight');
		expect(onMove).toHaveBeenCalledTimes(1);
		expect(onMove).toHaveBeenCalledWith(items[1], expect.any(KeyboardEvent));
		controller.destroy();
	});

	it('moves the tab stop to an item that receives focus, without a key', () => {
		const { items, outside, controller } = mount();
		controller.attach();
		controller.sync();

		items[2].focus();
		expect(tabStops(items)).toEqual([-1, -1, 0]);
		expect(controller.getActive()).toBe(items[2]);

		outside.focus();
		expect(controller.getActive()).toBe(items[2]);
		controller.destroy();
	});

	it('handles no keys for orientation none but still follows focus', () => {
		const { items, controller } = mount({ orientation: 'none' });
		controller.attach();
		controller.sync();

		expect(press(items[0], 'ArrowRight').defaultPrevented).toBe(false);
		expect(press(items[0], 'Home').defaultPrevented).toBe(false);
		items[1].focus();
		expect(controller.getActive()).toBe(items[1]);
		controller.destroy();
	});

	it('focus() and setActive() move the tab stop, only to real items', () => {
		const { items, controller } = mount();
		controller.sync();

		controller.setActive(items[1]);
		expect(tabStops(items)).toEqual([-1, 0, -1]);
		expect(document.activeElement).not.toBe(items[1]);

		controller.focus(items[2]);
		expect(tabStops(items)).toEqual([-1, -1, 0]);
		expect(document.activeElement).toBe(items[2]);

		controller.focus(document.createElement('button'));
		controller.setActive(document.createElement('button'));
		expect(controller.getActive()).toBe(items[2]);
	});

	it('navigate() moves from an item that is not focused, for a key the component routes itself', () => {
		const { items, controller } = mount();
		controller.sync();

		const result = controller.navigate(items[0], 'ArrowRight');

		expect(result).toEqual({ handled: true, index: 1, item: items[1] });
		expect(controller.getActive()).toBe(items[1]);
		expect(mount({ orientation: 'none' }).controller.navigate(null, 'Home')).toEqual({ handled: false });
	});

	it('stops listening on destroy and listens again after attach', () => {
		const { items, controller } = mount();
		controller.attach();
		controller.attach();
		controller.sync();
		press(items[0], 'ArrowRight');
		expect(controller.getActive()).toBe(items[1]);

		controller.destroy();
		controller.destroy();
		expect(controller.getActive()).toBeNull();
		expect(press(items[1], 'ArrowRight').defaultPrevented).toBe(false);

		controller.attach();
		controller.sync(items[0]);
		press(items[0], 'ArrowRight');
		expect(controller.getActive()).toBe(items[1]);
		controller.destroy();
	});

	it('reads nothing until it is attached or synced', () => {
		const getItems = vi.fn(() => []);
		const getTarget = vi.fn(() => null);

		const controller = new RovingController({ getItems, getTarget });

		expect(getItems).not.toHaveBeenCalled();
		expect(getTarget).not.toHaveBeenCalled();
		controller.destroy();
	});

	it('createRovingController attaches on connect and destroys on cleanup', () => {
		const connected: Array<() => void> = [];
		const cleanup: Array<() => void> = [];
		const host = {
			registerConnectedCallback: (callback: () => void) => connected.push(callback),
			registerCleanupCallback: (callback: () => void) => cleanup.push(callback),
		};
		const { items, root } = mount();
		const controller = createRovingController(host, { getItems: () => items, getTarget: () => root });

		press(items[0], 'ArrowRight');
		expect(document.activeElement).not.toBe(items[1]);

		connected.forEach((callback) => callback());
		controller.sync();
		press(items[0], 'ArrowRight');
		expect(document.activeElement).toBe(items[1]);

		cleanup.forEach((callback) => callback());
		expect(press(items[1], 'ArrowRight').defaultPrevented).toBe(false);
	});
});
