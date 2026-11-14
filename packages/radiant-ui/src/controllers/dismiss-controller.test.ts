import { afterEach, describe, expect, it, vi } from 'vitest';
import { DismissController, createDismissController, type DismissReason } from './dismiss-controller';

describe('DismissController on plain elements', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	function mount(options: { open?: () => boolean; triggers?: readonly DismissReason[]; settleFocus?: boolean; escapeScope?: 'document' | 'tree' } = {}) {
		const anchor = document.createElement('button');
		const surface = document.createElement('div');
		const inside = document.createElement('button');
		const outside = document.createElement('button');
		surface.append(inside);
		document.body.append(anchor, surface, outside);
		const onDismiss = vi.fn();
		const controller = new DismissController({
			getSurface: () => surface,
			getRelated: () => [anchor, null],
			getOpen: options.open,
			triggers: options.triggers,
			settleFocus: options.settleFocus,
			escapeScope: options.escapeScope,
			onDismiss,
		});
		return { anchor, surface, inside, outside, onDismiss, controller };
	}

	const pointerDown = (target: Node) => target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
	const focusOut = (target: Node, relatedTarget: Node | null) =>
		target.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget }));
	const keyDown = (target: Node, key: string) =>
		target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

	it('reports a pointer press outside the surface and its related elements, not inside', () => {
		const { anchor, surface, inside, outside, onDismiss, controller } = mount();
		controller.attach();

		pointerDown(anchor);
		pointerDown(surface);
		pointerDown(inside);
		expect(onDismiss).not.toHaveBeenCalled();

		pointerDown(outside);
		expect(onDismiss).toHaveBeenCalledTimes(1);
		expect(onDismiss).toHaveBeenCalledWith('pointer', expect.any(PointerEvent));

		controller.destroy();
	});

	it('reports focus leaving the tree, including to nowhere, but not focus moving within it', () => {
		const { anchor, inside, outside, onDismiss, controller } = mount();
		controller.attach();

		focusOut(inside, anchor);
		focusOut(anchor, inside);
		expect(onDismiss).not.toHaveBeenCalled();

		focusOut(inside, outside);
		focusOut(anchor, null);
		expect(onDismiss.mock.calls.map(([reason]) => reason)).toEqual(['focus', 'focus']);

		focusOut(outside, anchor);
		expect(onDismiss).toHaveBeenCalledTimes(2);

		controller.destroy();
	});

	it('reports Escape from anywhere in the document and ignores other keys', () => {
		const { outside, onDismiss, controller } = mount();
		controller.attach();

		keyDown(outside, 'Enter');
		expect(onDismiss).not.toHaveBeenCalled();

		keyDown(outside, 'Escape');
		expect(onDismiss).toHaveBeenCalledWith('escape', expect.any(KeyboardEvent));

		controller.destroy();
	});

	it('with settleFocus, judges a focus-out by where focus ended up', async () => {
		const { inside, outside, onDismiss, controller } = mount({ triggers: ['focus'], settleFocus: true });
		controller.attach();

		inside.focus();
		focusOut(inside, null);
		await Promise.resolve();
		expect(onDismiss).not.toHaveBeenCalled();

		outside.focus();
		await Promise.resolve();
		expect(onDismiss).toHaveBeenCalledTimes(1);

		focusOut(inside, null);
		expect(onDismiss).toHaveBeenCalledTimes(1);
		await Promise.resolve();
		expect(onDismiss).toHaveBeenCalledTimes(2);

		controller.destroy();
	});

	it('suppressFocus swallows the next focus-out only', async () => {
		const { inside, outside, onDismiss, controller } = mount({ triggers: ['focus'], settleFocus: true });
		controller.attach();

		controller.suppressFocus();
		focusOut(inside, outside);
		await Promise.resolve();
		expect(onDismiss).not.toHaveBeenCalled();

		focusOut(inside, outside);
		await Promise.resolve();
		expect(onDismiss).toHaveBeenCalledTimes(1);

		controller.destroy();
	});

	it('with settleFocus, a destroy before the focus settles reports nothing', async () => {
		const { inside, outside, onDismiss, controller } = mount({ triggers: ['focus'], settleFocus: true });
		controller.attach();

		focusOut(inside, outside);
		controller.destroy();
		await Promise.resolve();

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it('reports nothing while getOpen is false', () => {
		let open = false;
		const { outside, onDismiss, controller } = mount({ open: () => open });
		controller.attach();

		pointerDown(outside);
		keyDown(outside, 'Escape');
		expect(onDismiss).not.toHaveBeenCalled();

		open = true;
		pointerDown(outside);
		expect(onDismiss).toHaveBeenCalledTimes(1);

		controller.destroy();
	});

	it("with escapeScope 'tree', reports Escape only from inside the surface or related elements", () => {
		const { anchor, inside, outside, onDismiss, controller } = mount({ escapeScope: 'tree' });
		controller.attach();

		keyDown(outside, 'Escape');
		expect(onDismiss).not.toHaveBeenCalled();

		keyDown(inside, 'Escape');
		keyDown(anchor, 'Escape');
		expect(onDismiss).toHaveBeenCalledTimes(2);

		controller.destroy();
	});

	it('listens only for the requested triggers', () => {
		const { outside, onDismiss, controller } = mount({ triggers: ['pointer'] });
		controller.attach();

		keyDown(outside, 'Escape');
		focusOut(outside, null);
		expect(onDismiss).not.toHaveBeenCalled();

		pointerDown(outside);
		expect(onDismiss).toHaveBeenCalledTimes(1);

		controller.destroy();
	});

	it('does nothing before attach and after destroy, and attaches and destroys repeatedly', () => {
		const { outside, onDismiss, controller } = mount();
		const addListener = vi.spyOn(document, 'addEventListener');
		const removeListener = vi.spyOn(document, 'removeEventListener');

		pointerDown(outside);
		expect(onDismiss).not.toHaveBeenCalled();

		controller.attach();
		controller.attach();
		expect(addListener).toHaveBeenCalledTimes(3);
		pointerDown(outside);
		expect(onDismiss).toHaveBeenCalledTimes(1);

		controller.destroy();
		controller.destroy();
		expect(removeListener).toHaveBeenCalledTimes(3);
		pointerDown(outside);
		keyDown(outside, 'Escape');
		expect(onDismiss).toHaveBeenCalledTimes(1);

		controller.attach();
		pointerDown(outside);
		expect(onDismiss).toHaveBeenCalledTimes(2);

		controller.destroy();
		vi.restoreAllMocks();
	});

	it('contains answers for the surface, its descendants and the related elements', () => {
		const { anchor, surface, inside, outside, controller } = mount();

		expect(controller.contains(anchor)).toBe(true);
		expect(controller.contains(surface)).toBe(true);
		expect(controller.contains(inside)).toBe(true);
		expect(controller.contains(outside)).toBe(false);
		expect(controller.contains(null)).toBe(false);
	});

	it('createDismissController attaches on connect and destroys on cleanup', () => {
		const connected: (() => void)[] = [];
		const cleanup: (() => void)[] = [];
		const outside = document.createElement('button');
		document.body.append(outside);
		const onDismiss = vi.fn();
		createDismissController(
			{
				registerConnectedCallback: (callback) => connected.push(callback),
				registerCleanupCallback: (callback) => cleanup.push(callback),
			},
			{ getSurface: () => null, onDismiss },
		);

		pointerDown(outside);
		expect(onDismiss).not.toHaveBeenCalled();

		connected.forEach((callback) => callback());
		pointerDown(outside);
		expect(onDismiss).toHaveBeenCalledTimes(1);

		cleanup.forEach((callback) => callback());
		pointerDown(outside);
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});
});
