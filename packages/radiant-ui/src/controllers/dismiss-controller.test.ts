import { afterEach, describe, expect, it, vi } from 'vitest';
import { PortalController } from './portal-controller';
import { DismissController, createDismissController, type DismissReason } from './dismiss-controller';

describe('DismissController on plain elements', () => {
	const controllers: { destroy(): void }[] = [];

	afterEach(() => {
		controllers.splice(0).forEach((controller) => controller.destroy());
		document.body.replaceChildren();
	});

	function mount(
		options: {
			open?: () => boolean;
			triggers?: readonly DismissReason[];
			settleFocus?: boolean;
			escapeScope?: 'document' | 'tree';
		} = {},
	) {
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
		controllers.push(controller);
		return { anchor, surface, inside, outside, onDismiss, controller };
	}

	const pointerDown = (target: Node) => target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
	const focusOut = (target: Node, relatedTarget: Node | null) =>
		target.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget }));
	const keyDown = (target: Node, key: string) =>
		target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

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

	it('suppressFocus expires after the task, so a press that moves no focus does not swallow a later focus-out', async () => {
		const { inside, outside, onDismiss, controller } = mount({ triggers: ['focus'], settleFocus: true });
		controller.attach();

		controller.suppressFocus();
		await new Promise((resolve) => setTimeout(resolve, 0));
		focusOut(inside, outside);
		await Promise.resolve();

		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it('suppressFocus does not survive destroy and attach', async () => {
		const { inside, outside, onDismiss, controller } = mount({ triggers: ['focus'], settleFocus: true });
		controller.attach();

		controller.suppressFocus();
		controller.destroy();
		controller.attach();
		focusOut(inside, outside);
		await Promise.resolve();

		expect(onDismiss).toHaveBeenCalledTimes(1);
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

	it('reports Escape only to the nested layer, then to the outer one once it is closed', () => {
		const outerSurface = document.createElement('div');
		const innerSurface = document.createElement('div');
		const innerButton = document.createElement('button');
		innerSurface.append(innerButton);
		outerSurface.append(innerSurface);
		document.body.append(outerSurface);
		let innerOpen = true;
		const onOuter = vi.fn();
		const onInner = vi.fn();
		const outer = new DismissController({ getSurface: () => outerSurface, onDismiss: onOuter });
		const inner = new DismissController({
			getSurface: () => innerSurface,
			getOpen: () => innerOpen,
			onDismiss: onInner,
		});
		controllers.push(outer, inner);
		outer.attach();
		inner.attach();

		keyDown(innerButton, 'Escape');
		expect(onInner).toHaveBeenCalledTimes(1);
		expect(onOuter).not.toHaveBeenCalled();

		innerOpen = false;
		keyDown(innerButton, 'Escape');
		expect(onOuter).toHaveBeenCalledTimes(1);
		expect(onInner).toHaveBeenCalledTimes(1);
	});

	it('closes one layer per press when the inner layer listens first and closes on dismiss', () => {
		const outerSurface = document.createElement('div');
		const innerSurface = document.createElement('div');
		const innerButton = document.createElement('button');
		innerSurface.append(innerButton);
		outerSurface.append(innerSurface);
		document.body.append(outerSurface);
		let innerOpen = true;
		const onOuter = vi.fn();
		const inner = new DismissController({
			getSurface: () => innerSurface,
			getOpen: () => innerOpen,
			onDismiss: () => {
				innerOpen = false;
			},
		});
		const outer = new DismissController({ getSurface: () => outerSurface, onDismiss: onOuter });
		controllers.push(outer, inner);
		inner.attach();
		outer.attach();

		keyDown(innerButton, 'Escape');
		expect(onOuter).not.toHaveBeenCalled();

		keyDown(innerButton, 'Escape');
		expect(onOuter).toHaveBeenCalledTimes(1);
	});

	it('offers Escape to the next layer when the top layer returns false, and stops at the first that handles it', () => {
		const a = mount();
		const b = mount();
		const c = mount();
		a.onDismiss.mockReturnValue(undefined);
		b.onDismiss.mockReturnValue(false);
		c.onDismiss.mockReturnValue(false);
		a.controller.attach();
		b.controller.attach();
		c.controller.attach();

		keyDown(document.body, 'Escape');

		expect(c.onDismiss).toHaveBeenCalledTimes(1);
		expect(b.onDismiss).toHaveBeenCalledTimes(1);
		expect(a.onDismiss).toHaveBeenCalledTimes(1);
	});

	it('uses the Escape up when the top layer handles it, even when an earlier layer is open', () => {
		const a = mount();
		const b = mount();
		a.controller.attach();
		b.controller.attach();

		keyDown(document.body, 'Escape');

		expect(b.onDismiss).toHaveBeenCalledTimes(1);
		expect(a.onDismiss).not.toHaveBeenCalled();
	});

	it('ignores an Escape whose default was prevented by a handler closer to the target', () => {
		const { inside, onDismiss, controller } = mount();
		controller.attach();
		inside.addEventListener('keydown', (event) => event.preventDefault());

		keyDown(inside, 'Escape');

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it('reports Escape to the layer that holds the target when layers are not nested', () => {
		const a = mount();
		const b = mount();
		a.controller.attach();
		b.controller.attach();

		keyDown(a.inside, 'Escape');

		expect(a.onDismiss).toHaveBeenCalledTimes(1);
		expect(b.onDismiss).not.toHaveBeenCalled();
	});

	it('ignores Escape pressed while an input method is composing', () => {
		const { inside, onDismiss, controller } = mount();
		controller.attach();

		inside.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, isComposing: true }));

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it('does not treat a window blur, where the active element is unchanged, as focus leaving', () => {
		const { inside, onDismiss, controller } = mount();
		controller.attach();
		inside.focus();

		focusOut(inside, null);
		expect(onDismiss).not.toHaveBeenCalled();

		inside.blur();
		expect(onDismiss).toHaveBeenCalledTimes(1);
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
		pointerDown(outside);
		expect(onDismiss).not.toHaveBeenCalled();

		controller.attach();
		controller.attach();
		pointerDown(outside);
		expect(onDismiss).toHaveBeenCalledTimes(1);

		controller.destroy();
		controller.destroy();
		pointerDown(outside);
		keyDown(outside, 'Escape');
		expect(onDismiss).toHaveBeenCalledTimes(1);

		controller.attach();
		pointerDown(outside);
		expect(onDismiss).toHaveBeenCalledTimes(2);

		controller.destroy();
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

	it('attach() again reports once, and judges the surface it resolves then', () => {
		const { outside, inside, onDismiss } = mount();
		const other = document.createElement('div');
		const otherInside = document.createElement('button');
		other.append(otherInside);
		document.body.append(other);
		let surface: HTMLElement | null = inside.parentElement;
		const controller = new DismissController({ getSurface: () => surface, onDismiss });
		controller.attach();

		surface = other;
		controller.attach();
		controller.attach();

		pointerDown(otherInside);
		expect(onDismiss).not.toHaveBeenCalled();
		pointerDown(outside);
		expect(onDismiss).toHaveBeenCalledTimes(1);
		controller.destroy();
	});

	describe('a popup portaled out of the surface', () => {
		function mountPortaled(originIsInside: boolean) {
			const { surface, outside, onDismiss, controller } = mount();
			const elsewhere = document.createElement('div');
			document.body.append(elsewhere);
			const popup = document.createElement('div');
			const option = document.createElement('button');
			const nested = document.createElement('div');
			const nestedOption = document.createElement('button');
			popup.append(option);
			nested.append(nestedOption);
			(originIsInside ? surface : elsewhere).append(popup);
			const portal = new PortalController({ getNode: () => popup });
			portal.attach();
			controllers.push(portal);
			controller.attach();
			return { surface, outside, onDismiss, controller, popup, option, nested, nestedOption, portal };
		}

		it('counts a press and a focus change inside it as inside when its origin is inside the surface', () => {
			const { surface, option, outside, onDismiss, controller } = mountPortaled(true);
			expect(surface.contains(option)).toBe(false);

			pointerDown(option);
			focusOut(surface.querySelector('button')!, option);
			expect(onDismiss).not.toHaveBeenCalled();
			expect(controller.contains(option)).toBe(true);

			pointerDown(outside);
			expect(onDismiss).toHaveBeenCalledTimes(1);
		});

		it('follows the origin through a popup portaled out of another portaled popup', () => {
			const { popup, nested, nestedOption, onDismiss } = mountPortaled(true);
			popup.append(nested);
			const inner = new PortalController({ getNode: () => nested });
			inner.attach();
			controllers.push(inner);

			pointerDown(nestedOption);
			expect(onDismiss).not.toHaveBeenCalled();
		});

		it('still dismisses for a portaled popup whose origin is elsewhere', () => {
			const { option, onDismiss } = mountPortaled(false);

			pointerDown(option);
			expect(onDismiss).toHaveBeenCalledTimes(1);
		});

		it('stops counting the popup as inside once its portal is destroyed', () => {
			const { option, portal, controller } = mountPortaled(true);
			portal.destroy();
			document.body.append(option);

			expect(controller.contains(option)).toBe(false);
		});
	});
});
