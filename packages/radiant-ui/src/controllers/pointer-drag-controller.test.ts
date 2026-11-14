import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	PointerDragController,
	createPointerDragController,
	type PointerDragControllerConfig,
} from './pointer-drag-controller';

describe('PointerDragController on plain elements', () => {
	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	function mount(config: Partial<PointerDragControllerConfig> = {}) {
		const element = document.createElement('div');
		element.style.cssText = 'position:fixed;left:0;top:0;width:100px;height:100px';
		const other = document.createElement('div');
		other.style.cssText = 'position:fixed;left:200px;top:0;width:100px;height:100px';
		document.body.append(element, other);
		const setCapture = vi.spyOn(element, 'setPointerCapture').mockImplementation(() => {});
		const release = vi.spyOn(element, 'releasePointerCapture').mockImplementation(() => {});
		vi.spyOn(element, 'hasPointerCapture').mockReturnValue(true);
		const onStart = vi.fn();
		const onMove = vi.fn();
		const onEnd = vi.fn();
		const controller = new PointerDragController({
			getTarget: () => element,
			onStart,
			onMove,
			onEnd,
			...config,
		});
		return { element, other, setCapture, release, onStart, onMove, onEnd, controller };
	}

	const fire = (
		target: EventTarget,
		type: string,
		init: { x?: number; y?: number; id?: number; button?: number } = {},
	) =>
		target.dispatchEvent(
			new PointerEvent(type, {
				bubbles: true,
				pointerId: init.id ?? 1,
				button: init.button ?? 0,
				clientX: init.x ?? 0,
				clientY: init.y ?? 0,
			}),
		);

	it('is inert until attached', () => {
		const { element, onStart, controller } = mount();

		fire(element, 'pointerdown');

		expect(onStart).not.toHaveBeenCalled();
		expect(controller).toBeInstanceOf(PointerDragController);
	});

	it('captures the pointer and reports start with the press position', () => {
		const { element, setCapture, onStart, controller } = mount();
		controller.attach();

		fire(element, 'pointerdown', { x: 30, y: 40, id: 7 });

		expect(setCapture).toHaveBeenCalledWith(7);
		expect(onStart).toHaveBeenCalledTimes(1);
		expect(onStart.mock.calls[0][0]).toMatchObject({
			pointerId: 7,
			startX: 30,
			startY: 40,
			x: 30,
			y: 40,
			dx: 0,
			dy: 0,
		});
	});

	it('tracks the pointer on document without capturing it when capture is false', () => {
		const { element, setCapture, onMove, onEnd, controller } = mount({ capture: false });
		controller.attach();

		fire(element, 'pointerdown', { x: 10 });
		fire(document, 'pointermove', { x: 40 });
		fire(document, 'pointerup', { x: 40 });

		expect(setCapture).not.toHaveBeenCalled();
		expect(onMove).toHaveBeenCalledTimes(1);
		expect(onEnd.mock.calls[0][0]).toMatchObject({ reason: 'release' });
	});

	it('ignores other buttons and presses canStart refuses', () => {
		const { element, setCapture, onStart, controller } = mount({ canStart: (event) => event.clientX < 50 });
		controller.attach();

		fire(element, 'pointerdown', { button: 2 });
		fire(element, 'pointerdown', { x: 80 });

		expect(onStart).not.toHaveBeenCalled();
		expect(setCapture).not.toHaveBeenCalled();
	});

	it('reports move with position and delta from the press, wherever the pointer is', () => {
		const { element, onMove, controller } = mount();
		controller.attach();

		fire(element, 'pointerdown', { x: 10, y: 20 });
		fire(document, 'pointermove', { x: 40, y: 15 });
		fire(document, 'pointermove', { x: 5, y: 60 });

		expect(onMove.mock.calls.map(([info]) => [info.x, info.y, info.dx, info.dy])).toEqual([
			[40, 15, 30, -5],
			[5, 60, -5, 40],
		]);
	});

	it('answers which element is under the pointer, not the captured target', () => {
		const { element, other, onMove, controller } = mount();
		controller.attach();

		fire(element, 'pointerdown', { x: 10, y: 10 });
		fire(element, 'pointermove', { x: 250, y: 10 });
		fire(element, 'pointermove', { x: 50, y: 50 });

		expect(onMove.mock.calls[0][0].elementUnderPointer()).toBe(other);
		expect(onMove.mock.calls[1][0].elementUnderPointer()).toBe(element);
	});

	it('follows only the pointer that went down, ignoring a second press while dragging', () => {
		const { element, onStart, onMove, onEnd, controller } = mount();
		controller.attach();

		fire(element, 'pointerdown', { id: 1 });
		fire(element, 'pointerdown', { id: 2 });
		fire(document, 'pointermove', { id: 2, x: 50 });
		fire(document, 'pointerup', { id: 2 });

		expect(onStart).toHaveBeenCalledTimes(1);
		expect(onMove).not.toHaveBeenCalled();
		expect(onEnd).not.toHaveBeenCalled();
	});

	it('ends on pointer up with reason release and releases capture and listeners', () => {
		const { element, release, onMove, onEnd, controller } = mount();
		controller.attach();

		fire(element, 'pointerdown', { x: 10 });
		fire(document, 'pointerup', { x: 70 });
		fire(document, 'pointermove', { x: 90 });

		expect(onEnd).toHaveBeenCalledTimes(1);
		expect(onEnd.mock.calls[0][0]).toMatchObject({ reason: 'release', x: 70, dx: 60 });
		expect(release).toHaveBeenCalledWith(1);
		expect(onMove).not.toHaveBeenCalled();
	});

	it('ends on pointer cancel with reason cancel', () => {
		const { element, onEnd, controller } = mount();
		controller.attach();

		fire(element, 'pointerdown');
		fire(document, 'pointercancel');

		expect(onEnd).toHaveBeenCalledTimes(1);
		expect(onEnd.mock.calls[0][0].reason).toBe('cancel');
	});

	it('adds its document listeners for the drag only and removes every one when it ends', () => {
		const { element, controller } = mount();
		const added = vi.spyOn(document, 'addEventListener');
		const removed = vi.spyOn(document, 'removeEventListener');
		controller.attach();
		expect(added).not.toHaveBeenCalled();

		fire(element, 'pointerdown');
		expect(added.mock.calls.map(([type]) => type).sort()).toEqual(['pointercancel', 'pointermove', 'pointerup']);

		fire(document, 'pointerup');
		expect(removed.mock.calls.map(([type]) => type).sort()).toEqual(['pointercancel', 'pointermove', 'pointerup']);
	});

	it('starts a new drag after one ends', () => {
		const { element, onStart, controller } = mount();
		controller.attach();

		fire(element, 'pointerdown');
		fire(document, 'pointerup');
		fire(element, 'pointerdown');

		expect(onStart).toHaveBeenCalledTimes(2);
	});

	it('destroy during a drag ends it with reason destroy, releases capture and stops moves', () => {
		const { element, release, onMove, onEnd, controller } = mount();
		controller.attach();
		fire(element, 'pointerdown', { x: 10 });

		controller.destroy();
		controller.destroy();
		fire(document, 'pointermove', { x: 50 });
		fire(document, 'pointerup', { x: 50 });

		expect(onEnd).toHaveBeenCalledTimes(1);
		expect(onEnd.mock.calls[0][0].reason).toBe('destroy');
		expect(release).toHaveBeenCalledTimes(1);
		expect(onMove).not.toHaveBeenCalled();
	});

	it('does nothing on destroy without a drag, stops listening, and attaches again', () => {
		const { element, onStart, onEnd, controller } = mount();
		controller.attach();

		controller.destroy();
		expect(onEnd).not.toHaveBeenCalled();
		fire(element, 'pointerdown');
		expect(onStart).not.toHaveBeenCalled();

		controller.attach();
		fire(element, 'pointerdown');
		expect(onStart).toHaveBeenCalledTimes(1);
	});

	it('still drags when the browser refuses pointer capture', () => {
		const { element, setCapture, onStart, onMove, controller } = mount();
		setCapture.mockImplementation(() => {
			throw new DOMException('no such pointer', 'NotFoundError');
		});
		controller.attach();

		fire(element, 'pointerdown');
		fire(document, 'pointermove', { x: 20 });

		expect(onStart).toHaveBeenCalledTimes(1);
		expect(onMove).toHaveBeenCalledTimes(1);
	});

	it('binds to a host: attach on connect, destroy on cleanup', () => {
		const element = document.createElement('div');
		document.body.append(element);
		let connected = () => {};
		let cleanup = () => {};
		const onStart = vi.fn();
		const onEnd = vi.fn();
		createPointerDragController(
			{
				registerConnectedCallback: (callback) => (connected = callback),
				registerCleanupCallback: (callback) => (cleanup = callback),
			},
			{ getTarget: () => element, onStart, onEnd },
		);

		connected();
		fire(element, 'pointerdown');
		expect(onStart).toHaveBeenCalledTimes(1);

		cleanup();
		expect(onEnd.mock.calls[0][0].reason).toBe('destroy');
	});

	it('moves to the target a second attach() resolves, without duplicate listeners', () => {
		let current: HTMLElement | null = null;
		const { element, other, onStart, controller } = mount({ getTarget: () => current });
		controller.attach();
		fire(element, 'pointerdown');
		expect(onStart).not.toHaveBeenCalled();

		current = element;
		controller.attach();
		controller.attach();
		current = other;
		controller.attach();

		fire(element, 'pointerdown', { id: 2 });
		expect(onStart).not.toHaveBeenCalled();
		fire(other, 'pointerdown');
		expect(onStart).toHaveBeenCalledTimes(1);
		controller.destroy();
	});
});
