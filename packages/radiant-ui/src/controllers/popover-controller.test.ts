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

	it('portals the surface the config returns now when it changes while open, and puts the old one back', () => {
		const host = document.createElement('section');
		const anchor = document.createElement('button');
		const first = document.createElement('div');
		const second = document.createElement('div');
		host.append(anchor, first, second);
		document.body.append(host);
		const controller = new PopoverController({
			getAnchor: () => anchor,
			getFloating: () => first,
			getOpen: () => true,
			getPlacement: () => 'bottom',
		});

		controller.attach();
		controller.sync();
		expect(first.parentNode).toBe(document.body);

		controller.updateConfig({ getFloating: () => second });
		controller.sync();

		expect(first.parentNode).toBe(host);
		expect(second.parentNode).toBe(document.body);

		controller.destroy();
	});
});

describe('PopoverController portal container', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	function setup(getPortalContainer?: () => ParentNode | null) {
		const host = document.createElement('section');
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		host.append(anchor, floating);
		document.body.append(host);
		let open = true;
		const controller = new PopoverController({
			getAnchor: () => anchor,
			getFloating: () => floating,
			getOpen: () => open,
			getPlacement: () => 'bottom',
			getPortalContainer,
		});
		controller.attach();
		return { host, floating, controller, setOpen: (next: boolean) => (open = next) };
	}

	it('mounts the surface in the container the getter returns and returns it on close', () => {
		const frame = document.createElement('div');
		document.body.append(frame);
		const { host, floating, controller, setOpen } = setup(() => frame);

		controller.sync();
		expect(floating.parentNode).toBe(frame);

		setOpen(false);
		controller.sync();
		expect(floating.parentNode).toBe(host);
		controller.destroy();
	});

	it('resolves the container again each time the surface opens', () => {
		const first = document.createElement('div');
		const second = document.createElement('div');
		document.body.append(first, second);
		let container: ParentNode = first;
		const { floating, controller, setOpen } = setup(() => container);

		controller.sync();
		expect(floating.parentNode).toBe(first);
		setOpen(false);
		controller.sync();

		container = second;
		setOpen(true);
		controller.sync();
		expect(floating.parentNode).toBe(second);
		controller.destroy();
	});

	it('falls back to document.body when the getter returns null', () => {
		const { floating, controller } = setup(() => null);

		controller.sync();

		expect(floating.parentNode).toBe(document.body);
		controller.destroy();
	});
});

describe('PopoverController default container inside a modal', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	function setup(modal: HTMLElement, getPortalContainer?: () => ParentNode | null) {
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		modal.append(anchor, floating);
		document.body.append(modal);
		const controller = new PopoverController({
			getAnchor: () => anchor,
			getFloating: () => floating,
			getOpen: () => true,
			getPlacement: () => 'bottom',
			getPortalContainer,
		});
		controller.attach();
		controller.sync();
		return { floating, controller };
	}

	function ariaModal(): HTMLElement {
		const modal = document.createElement('div');
		modal.setAttribute('aria-modal', 'true');
		return modal;
	}

	it('mounts the surface in the nearest aria-modal ancestor of the anchor', () => {
		const modal = ariaModal();
		const { floating, controller } = setup(modal);
		expect(floating.parentNode).toBe(modal);
		controller.destroy();
	});

	it('mounts the surface in an open modal dialog element, which sets no aria-modal', () => {
		const dialog = document.createElement('dialog');
		document.body.append(dialog);
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		dialog.append(anchor, floating);
		dialog.showModal();
		const controller = new PopoverController({
			getAnchor: () => anchor,
			getFloating: () => floating,
			getOpen: () => true,
			getPlacement: () => 'bottom',
		});
		controller.attach();
		controller.sync();
		expect(floating.parentNode).toBe(dialog);
		controller.destroy();
		dialog.close();
	});

	it('goes to document.body when no modal holds the anchor', () => {
		const section = document.createElement('section');
		const { floating, controller } = setup(section);
		expect(floating.parentNode).toBe(document.body);
		controller.destroy();
	});

	it('lets an explicit container win over the modal', () => {
		const frame = document.createElement('div');
		document.body.append(frame);
		const { floating, controller } = setup(ariaModal(), () => frame);
		expect(floating.parentNode).toBe(frame);
		controller.destroy();
	});

	it('falls back to the modal when the container getter returns null', () => {
		const modal = ariaModal();
		const { floating, controller } = setup(modal, () => null);
		expect(floating.parentNode).toBe(modal);
		controller.destroy();
	});
});
