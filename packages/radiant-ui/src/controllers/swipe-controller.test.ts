import { afterEach, describe, expect, it, vi } from 'vitest';
import { SwipeController, createSwipeController, type SwipeControllerConfig } from './swipe-controller';

describe('SwipeController on plain elements', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	function mount(config: Partial<SwipeControllerConfig> = {}) {
		const element = document.createElement('div');
		const inner = document.createElement('button');
		element.append(inner);
		document.body.append(element);
		const onSwipe = vi.fn();
		const controller = new SwipeController({ getTarget: () => element, onSwipe, ...config });
		return { element, inner, onSwipe, controller };
	}

	const pointer = (
		target: EventTarget,
		type: string,
		init: { x: number; y: number; id?: number; button?: number },
	) =>
		target.dispatchEvent(
			new PointerEvent(type, {
				bubbles: true,
				pointerId: init.id ?? 1,
				button: init.button ?? 0,
				clientX: init.x,
				clientY: init.y,
			}),
		);

	it('is inert until attached', () => {
		const { element, onSwipe } = mount();

		pointer(element, 'pointerdown', { x: 200, y: 0 });
		pointer(element, 'pointerup', { x: 100, y: 0 });

		expect(onSwipe).not.toHaveBeenCalled();
	});

	it('reports left and right on the default x axis', () => {
		const { element, onSwipe, controller } = mount();
		controller.attach();

		pointer(element, 'pointerdown', { x: 200, y: 50 });
		pointer(element, 'pointerup', { x: 100, y: 50 });
		pointer(element, 'pointerdown', { x: 100, y: 50 });
		pointer(element, 'pointerup', { x: 200, y: 50 });

		expect(onSwipe.mock.calls.map(([direction]) => direction)).toEqual(['left', 'right']);
	});

	it('ignores vertical swipes on x and horizontal swipes on y, and reports both axes for both', () => {
		const x = mount();
		x.controller.attach();
		pointer(x.element, 'pointerdown', { x: 0, y: 200 });
		pointer(x.element, 'pointerup', { x: 0, y: 100 });
		expect(x.onSwipe).not.toHaveBeenCalled();

		const y = mount({ axis: 'y' });
		y.controller.attach();
		pointer(y.element, 'pointerdown', { x: 200, y: 0 });
		pointer(y.element, 'pointerup', { x: 100, y: 0 });
		pointer(y.element, 'pointerdown', { x: 0, y: 200 });
		pointer(y.element, 'pointerup', { x: 0, y: 100 });
		expect(y.onSwipe.mock.calls.map(([direction]) => direction)).toEqual(['up']);

		const both = mount({ axis: 'both' });
		both.controller.attach();
		pointer(both.element, 'pointerdown', { x: 0, y: 0 });
		pointer(both.element, 'pointerup', { x: 0, y: 90 });
		expect(both.onSwipe).toHaveBeenCalledWith('down', expect.any(PointerEvent));
	});

	it('honors the threshold', () => {
		const { element, onSwipe, controller } = mount({ threshold: 100 });
		controller.attach();

		pointer(element, 'pointerdown', { x: 200, y: 0 });
		pointer(element, 'pointerup', { x: 120, y: 0 });
		expect(onSwipe).not.toHaveBeenCalled();

		pointer(element, 'pointerdown', { x: 200, y: 0 });
		pointer(element, 'pointerup', { x: 90, y: 0 });
		expect(onSwipe).toHaveBeenCalledTimes(1);
	});

	it('tracks only the pointer that went down and only the primary button', () => {
		const { element, onSwipe, controller } = mount();
		controller.attach();

		pointer(element, 'pointerdown', { x: 200, y: 0, id: 1 });
		pointer(element, 'pointerup', { x: 60, y: 0, id: 2 });
		expect(onSwipe).not.toHaveBeenCalled();
		pointer(element, 'pointerup', { x: 60, y: 0, id: 1 });
		expect(onSwipe).toHaveBeenCalledTimes(1);

		pointer(element, 'pointerdown', { x: 200, y: 0, button: 2 });
		pointer(element, 'pointerup', { x: 60, y: 0 });
		expect(onSwipe).toHaveBeenCalledTimes(1);
	});

	it('skips a gesture that starts on an excluded target', () => {
		const { inner, element, onSwipe, controller } = mount({
			exclude: (target) => target instanceof Element && target.closest('button') !== null,
		});
		controller.attach();

		pointer(inner, 'pointerdown', { x: 200, y: 0 });
		pointer(element, 'pointerup', { x: 60, y: 0 });
		expect(onSwipe).not.toHaveBeenCalled();

		pointer(element, 'pointerdown', { x: 200, y: 0 });
		pointer(element, 'pointerup', { x: 60, y: 0 });
		expect(onSwipe).toHaveBeenCalledTimes(1);
	});

	it('drops the gesture on pointer cancel', () => {
		const { element, onSwipe, controller } = mount();
		controller.attach();

		pointer(element, 'pointerdown', { x: 200, y: 0 });
		pointer(element, 'pointercancel', { x: 200, y: 0 });
		pointer(element, 'pointerup', { x: 60, y: 0 });

		expect(onSwipe).not.toHaveBeenCalled();
	});

	it('stops listening on destroy, drops a gesture in flight, and attaches again', () => {
		const { element, onSwipe, controller } = mount();
		controller.attach();
		pointer(element, 'pointerdown', { x: 200, y: 0 });

		controller.destroy();
		controller.destroy();
		controller.attach();
		pointer(element, 'pointerup', { x: 60, y: 0 });
		expect(onSwipe).not.toHaveBeenCalled();

		pointer(element, 'pointerdown', { x: 200, y: 0 });
		pointer(element, 'pointerup', { x: 60, y: 0 });
		expect(onSwipe).toHaveBeenCalledTimes(1);

		controller.destroy();
		pointer(element, 'pointerdown', { x: 200, y: 0 });
		pointer(element, 'pointerup', { x: 60, y: 0 });
		expect(onSwipe).toHaveBeenCalledTimes(1);
	});

	it('binds to a host: attach on connect, destroy on cleanup', () => {
		const element = document.createElement('div');
		document.body.append(element);
		let connected = () => {};
		let cleanup = () => {};
		const onSwipe = vi.fn();
		createSwipeController(
			{
				registerConnectedCallback: (callback) => (connected = callback),
				registerCleanupCallback: (callback) => (cleanup = callback),
			},
			{ getTarget: () => element, onSwipe },
		);

		connected();
		pointer(element, 'pointerdown', { x: 200, y: 0 });
		pointer(element, 'pointerup', { x: 60, y: 0 });
		expect(onSwipe).toHaveBeenCalledTimes(1);

		cleanup();
		pointer(element, 'pointerdown', { x: 200, y: 0 });
		pointer(element, 'pointerup', { x: 60, y: 0 });
		expect(onSwipe).toHaveBeenCalledTimes(1);
	});
});
