import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	PopoverController,
	createPopoverController,
	popoverContains,
	shouldDismissPopoverFocus,
	shouldDismissPopoverPointer,
} from './popover-controller';

describe('popover-controller helpers', () => {
	it('popoverContains returns true for anchor and floating descendants', () => {
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		const child = document.createElement('span');
		floating.append(child);
		document.body.append(anchor, floating);

		expect(popoverContains(anchor, floating, anchor)).toBe(true);
		expect(popoverContains(anchor, floating, child)).toBe(true);
		expect(popoverContains(anchor, floating, document.body)).toBe(false);

		anchor.remove();
		floating.remove();
	});

	it('shouldDismissPopoverFocus ignores focus moves inside the tree', () => {
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		const item = document.createElement('button');
		floating.append(item);
		document.body.append(anchor, floating);

		expect(shouldDismissPopoverFocus(anchor, floating, item)).toBe(false);
		expect(shouldDismissPopoverFocus(anchor, floating, document.body)).toBe(true);

		anchor.remove();
		floating.remove();
	});

	it('shouldDismissPopoverPointer ignores clicks inside the tree', () => {
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		document.body.append(anchor, floating);

		expect(shouldDismissPopoverPointer(anchor, floating, anchor)).toBe(false);
		expect(shouldDismissPopoverPointer(anchor, floating, floating)).toBe(false);
		expect(shouldDismissPopoverPointer(anchor, floating, document.body)).toBe(true);

		anchor.remove();
		floating.remove();
	});

	it('retains a portaled surface until teardown', () => {
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		let open = true;
		let configuredFloating: HTMLElement | null = floating;
		const controller = new PopoverController({
			getAnchor: () => anchor,
			getFloating: () => configuredFloating,
			getOpen: () => open,
			getPlacement: () => 'bottom',
			portal: true,
		});
		document.body.append(anchor, floating);

		controller.attach();
		controller.sync();
		configuredFloating = null;
		expect(controller.getFloatingElement()).toBe(floating);

		open = false;
		controller.sync();
		expect(floating.hidden).toBe(true);
		expect(floating.parentNode).toBe(document.body);
		controller.destroy();
		expect(floating.parentNode).toBe(document.body);

		anchor.remove();
		floating.remove();
	});
});

describe('PopoverController attached to a plain element', () => {
	const observers: { observed: Element[]; disconnected: boolean }[] = [];

	class RecordingResizeObserver {
		record = { observed: [] as Element[], disconnected: false };
		constructor() {
			observers.push(this.record);
		}
		observe(target: Element): void {
			this.record.observed.push(target);
		}
		unobserve(): void {}
		disconnect(): void {
			this.record.disconnected = true;
		}
	}

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		observers.length = 0;
	});

	function mount() {
		vi.stubGlobal('ResizeObserver', RecordingResizeObserver);
		const addListener = vi.spyOn(window, 'addEventListener');
		const removeListener = vi.spyOn(window, 'removeEventListener');
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		document.body.append(anchor, floating);
		const controller = new PopoverController({
			getAnchor: () => anchor,
			getFloating: () => floating,
			getOpen: () => true,
			getPlacement: () => 'bottom',
			portal: false,
		});
		return { anchor, floating, controller, addListener, removeListener };
	}

	it('does nothing on sync before attach', () => {
		const { anchor, floating, controller, addListener } = mount();

		controller.sync();

		expect(addListener).not.toHaveBeenCalledWith('resize', expect.any(Function));
		expect(observers).toHaveLength(0);

		anchor.remove();
		floating.remove();
	});

	it('removes the floating listeners and observer on destroy, and again on a second destroy', () => {
		const { anchor, floating, controller, addListener, removeListener } = mount();

		controller.attach();
		controller.sync();

		const resizeListener = addListener.mock.calls.find(([type]) => type === 'resize')?.[1];
		const scrollListener = addListener.mock.calls.find(([type]) => type === 'scroll')?.[1];
		expect(resizeListener).toBeTypeOf('function');
		expect(scrollListener).toBeTypeOf('function');
		expect(observers).toHaveLength(1);
		expect(observers[0].observed).toEqual([anchor, floating]);
		expect(observers[0].disconnected).toBe(false);

		controller.destroy();
		controller.destroy();

		expect(removeListener).toHaveBeenCalledWith('resize', resizeListener);
		expect(removeListener).toHaveBeenCalledWith('scroll', scrollListener, true);
		expect(observers[0].disconnected).toBe(true);

		controller.sync();
		expect(observers).toHaveLength(1);

		anchor.remove();
		floating.remove();
	});

	it('works again after destroy and attach', () => {
		const { anchor, floating, controller } = mount();

		controller.attach();
		controller.destroy();
		controller.attach();
		controller.sync();

		expect(observers).toHaveLength(1);
		expect(observers[0].disconnected).toBe(false);

		controller.destroy();
		anchor.remove();
		floating.remove();
	});

	it('createPopoverController attaches on connect and destroys on cleanup', () => {
		vi.stubGlobal('ResizeObserver', RecordingResizeObserver);
		const connected: (() => void)[] = [];
		const cleanup: (() => void)[] = [];
		const host = {
			registerConnectedCallback: (callback: () => void) => connected.push(callback),
			registerCleanupCallback: (callback: () => void) => cleanup.push(callback),
		};
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		document.body.append(anchor, floating);
		const controller = createPopoverController(host, {
			getAnchor: () => anchor,
			getFloating: () => floating,
			getOpen: () => true,
			getPlacement: () => 'bottom',
			portal: false,
		});

		controller.sync();
		expect(observers).toHaveLength(0);

		connected.forEach((callback) => callback());
		controller.sync();
		expect(observers[0].disconnected).toBe(false);

		cleanup.forEach((callback) => callback());
		expect(observers[0].disconnected).toBe(true);

		anchor.remove();
		floating.remove();
	});
});
