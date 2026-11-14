import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindController, type ControllerHost } from './controller';
import { DismissController } from './dismiss-controller';
import { PointerDragController } from './pointer-drag-controller';
import { PopoverController } from './popover-controller';
import type { RovingNavResult } from '@/lib/roving-tabindex';
import { RovingController } from './roving-controller';
import { SortableController, type SortableChange } from './sortable-controller';
import { SwipeController } from './swipe-controller';
import type { SwipeDirection } from './swipe-direction';

/** A host that runs the registered callbacks on demand, like a connecting and disconnecting element. */
function createHost() {
	const connected: Array<() => void> = [];
	const cleanup: Array<() => void> = [];
	const host: ControllerHost = {
		registerConnectedCallback: (callback) => connected.push(callback),
		registerCleanupCallback: (callback) => cleanup.push(callback),
	};
	return {
		host,
		connect: () => connected.forEach((callback) => callback()),
		disconnect: () => cleanup.forEach((callback) => callback()),
	};
}

const pointer = (target: EventTarget, type: string, init: { x?: number; y?: number; button?: number } = {}) =>
	target.dispatchEvent(
		new PointerEvent(type, {
			bubbles: true,
			pointerId: 1,
			button: init.button ?? 0,
			clientX: init.x ?? 0,
			clientY: init.y ?? 0,
		}),
	);

describe('extending a controller through its protected hooks', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it('SwipeController.resolveDirection changes what counts as a swipe, with lifecycle binding intact', () => {
		class EagerSwipe extends SwipeController {
			protected override resolveDirection(dx: number): SwipeDirection | null {
				return dx > 10 ? 'right' : null;
			}
		}
		const element = document.createElement('div');
		document.body.append(element);
		const onSwipe = vi.fn();
		const base = new SwipeController({ getTarget: () => element, onSwipe });
		const eager = new EagerSwipe({ getTarget: () => element, onSwipe });
		const { host, connect, disconnect } = createHost();

		base.attach();
		pointer(element, 'pointerdown', { x: 0 });
		pointer(element, 'pointerup', { x: 20 });
		expect(onSwipe).not.toHaveBeenCalled();
		base.destroy();

		expect(bindController(host, eager)).toBe(eager);
		connect();
		pointer(element, 'pointerdown', { x: 0 });
		pointer(element, 'pointerup', { x: 20 });
		expect(onSwipe).toHaveBeenCalledWith('right', expect.any(PointerEvent));

		disconnect();
		pointer(element, 'pointerdown', { x: 0 });
		pointer(element, 'pointerup', { x: 20 });
		expect(onSwipe).toHaveBeenCalledTimes(1);
	});

	it('PointerDragController.acceptsPress changes which presses start a drag', () => {
		class AnyButtonDrag extends PointerDragController {
			protected override acceptsPress(): boolean {
				return true;
			}
		}
		const element = document.createElement('div');
		document.body.append(element);
		const onStart = vi.fn();
		const base = new PointerDragController({ getTarget: () => element, capture: false, onStart });
		const any = new AnyButtonDrag({ getTarget: () => element, capture: false, onStart });
		const { host, connect, disconnect } = createHost();

		base.attach();
		pointer(element, 'pointerdown', { button: 1 });
		expect(onStart).not.toHaveBeenCalled();
		base.destroy();

		bindController(host, any);
		connect();
		pointer(element, 'pointerdown', { button: 1 });
		expect(onStart).toHaveBeenCalledTimes(1);

		disconnect();
		pointer(document, 'pointerup');
		pointer(element, 'pointerdown', { button: 1 });
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it('DismissController.isInside changes what counts as outside', () => {
		const surface = document.createElement('div');
		const neighbour = document.createElement('button');
		document.body.append(surface, neighbour);
		class NeighbourDismiss extends DismissController {
			protected override isInside(node: Node): boolean {
				return neighbour.contains(node) || super.isInside(node);
			}
		}
		const onDismiss = vi.fn();
		const config = { getSurface: () => surface, onDismiss };
		const base = new DismissController(config);
		const wide = new NeighbourDismiss(config);
		const { host, connect, disconnect } = createHost();

		base.attach();
		pointer(neighbour, 'pointerdown');
		expect(onDismiss).toHaveBeenCalledTimes(1);
		expect(base.contains(neighbour)).toBe(false);
		base.destroy();

		bindController(host, wide);
		connect();
		pointer(neighbour, 'pointerdown');
		expect(onDismiss).toHaveBeenCalledTimes(1);
		expect(wide.contains(neighbour)).toBe(true);
		expect(wide.isOutside(neighbour)).toBe(false);
		expect(wide.contains(surface)).toBe(true);

		disconnect();
		pointer(document.body, 'pointerdown');
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it('RovingController.resolveNext changes where a key moves focus', () => {
		class SkipTwo extends RovingController {
			protected override resolveNext(items: HTMLElement[], current: HTMLElement | null): RovingNavResult {
				const next = items[(items.indexOf(current!) + 2) % items.length];
				return { handled: true, item: next, index: items.indexOf(next) };
			}
		}
		const root = document.createElement('div');
		const items = [0, 1, 2, 3].map(() => root.appendChild(document.createElement('button')));
		document.body.append(root);
		const onMove = vi.fn();
		const { host, connect, disconnect } = createHost();
		const roving = bindController(host, new SkipTwo({ getItems: () => items, getTarget: () => root, onMove }));
		const key = () => items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

		connect();
		roving.sync();
		key();
		expect(onMove).toHaveBeenCalledWith(items[2], expect.any(KeyboardEvent));
		expect(roving.getActive()).toBe(items[2]);

		disconnect();
		key();
		expect(onMove).toHaveBeenCalledTimes(1);
	});

	it('PopoverController.position replaces the placement and its cleanup runs on destroy', () => {
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		document.body.append(anchor, floating);
		const cleanup = vi.fn();
		const positions: Array<[HTMLElement, HTMLElement]> = [];
		class FixedPopover extends PopoverController {
			protected override position(a: HTMLElement, f: HTMLElement): () => void {
				positions.push([a, f]);
				f.style.left = '7px';
				return cleanup;
			}
		}
		const { host, connect, disconnect } = createHost();
		const popover = bindController(
			host,
			new FixedPopover({
				getAnchor: () => anchor,
				getFloating: () => floating,
				getOpen: () => true,
				getPlacement: () => 'bottom',
				portal: false,
			}),
		);

		popover.sync();
		expect(positions).toHaveLength(0);
		connect();
		popover.sync();
		expect(positions).toEqual([[anchor, floating]]);
		expect(floating.style.left).toBe('7px');
		popover.sync();
		expect(cleanup).toHaveBeenCalledTimes(1);

		disconnect();
		expect(cleanup).toHaveBeenCalledTimes(2);
	});

	it('SortableController.resolveTargetIndex changes the index a drag resolves to', () => {
		class AlwaysFirst extends SortableController {
			protected override resolveTargetIndex(): number {
				return 0;
			}
		}
		const list = document.createElement('ul');
		list.style.cssText = 'position:fixed;left:0;top:0;margin:0;padding:0;list-style:none;width:100px';
		for (const label of ['a', 'b', 'c']) {
			const item = list.appendChild(document.createElement('li'));
			item.style.cssText = 'height:20px';
			item.textContent = label;
		}
		document.body.append(list);
		const items = () => [...list.children] as HTMLElement[];
		const onChange = vi.fn<(change: SortableChange) => void>();
		const config = { getContainer: () => list, getItems: items, onChange };
		const base = new SortableController(config);
		const first = new AlwaysFirst(config);
		const { host, connect, disconnect } = createHost();
		const drag = () => {
			pointer(items()[2], 'pointerdown', { x: 5, y: 50 });
			pointer(document, 'pointermove', { x: 5, y: 55 });
			pointer(document, 'pointerup', { x: 5, y: 55 });
		};

		base.attach();
		drag();
		expect(onChange).not.toHaveBeenCalled();
		base.destroy();

		bindController(host, first);
		connect();
		drag();
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ from: 2, to: 0 }));

		disconnect();
		drag();
		expect(onChange).toHaveBeenCalledTimes(1);
	});
});
