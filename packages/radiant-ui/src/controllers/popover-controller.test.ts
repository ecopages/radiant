import { afterEach, describe, expect, it, vi } from 'vitest';
import { PopoverController, createPopoverController } from './popover-controller';

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

		expect(removeListener).toHaveBeenCalledWith('resize', resizeListener, undefined);
		expect(removeListener).toHaveBeenCalledWith('scroll', scrollListener, { capture: true });
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

describe('PopoverController dismissal', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	function mount(options: { dismissOn?: ('pointer' | 'focus' | 'escape')[]; open?: () => boolean } = {}) {
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		const outside = document.createElement('button');
		document.body.append(anchor, floating, outside);
		const onDismiss = vi.fn();
		const controller = new PopoverController({
			getAnchor: () => anchor,
			getFloating: () => floating,
			getOpen: options.open ?? (() => false),
			getPlacement: () => 'bottom',
			portal: false,
			onDismiss,
			dismissOn: options.dismissOn,
		});
		return { anchor, floating, outside, onDismiss, controller };
	}

	it('reports dismissals from attach until destroy, with the anchor and floating surface as the inside', () => {
		const { anchor, floating, outside, onDismiss, controller } = mount({ open: () => true });

		outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		expect(onDismiss).not.toHaveBeenCalled();

		controller.attach();
		anchor.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		floating.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		expect(onDismiss).not.toHaveBeenCalled();

		outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		outside.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		anchor.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
		expect(onDismiss.mock.calls.map(([reason]) => reason)).toEqual(['pointer', 'escape', 'focus']);

		controller.destroy();
		outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		expect(onDismiss).toHaveBeenCalledTimes(3);
	});

	it('reports nothing while closed and only the triggers named in dismissOn', () => {
		const closed = mount();
		closed.controller.attach();
		closed.outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		expect(closed.onDismiss).not.toHaveBeenCalled();
		closed.controller.destroy();

		const pointerOnly = mount({ open: () => true, dismissOn: ['pointer'] });
		pointerOnly.controller.attach();
		pointerOnly.outside.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		expect(pointerOnly.onDismiss).not.toHaveBeenCalled();
		pointerOnly.controller.destroy();
	});

	it('contains and isOutside answer for the anchor and floating surface', () => {
		const { anchor, floating, outside, controller } = mount();

		expect(controller.contains(anchor)).toBe(true);
		expect(controller.contains(floating)).toBe(true);
		expect(controller.contains(outside)).toBe(false);
		expect(controller.isOutside(outside)).toBe(true);
		expect(controller.isOutside(null)).toBe(true);
		expect(controller.isOutside(anchor)).toBe(false);
	});
});

describe('PopoverController portal theming', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it('keeps the --rui-* values and dark scope of a themed host on the portaled surface, and returns the surface on destroy', () => {
		const host = document.createElement('section');
		host.classList.add('dark');
		host.style.setProperty('--rui-popover-surface', 'rgb(4, 5, 6)');
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		host.append(anchor, floating);
		document.body.append(host);
		const controller = new PopoverController({
			getAnchor: () => anchor,
			getFloating: () => floating,
			getOpen: () => true,
			getPlacement: () => 'bottom',
		});

		controller.attach();
		controller.sync();

		expect(floating.parentNode).toBe(document.body);
		expect(getComputedStyle(floating).getPropertyValue('--rui-popover-surface')).toBe('rgb(4, 5, 6)');
		expect(floating.classList.contains('dark')).toBe(true);

		controller.destroy();
		expect(floating.parentNode).toBe(host);
		expect(floating.classList.contains('dark')).toBe(false);
	});
});
