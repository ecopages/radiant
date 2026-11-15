import { describe, expect, it, vi } from 'vitest';
import { EventListenerController, createEventListenerController } from './event-listener-controller';

describe('EventListenerController', () => {
	it('listens to every type between attach and destroy and nothing after', () => {
		const target = new EventTarget();
		const listener = vi.fn();
		const controller = new EventListenerController({ getTarget: () => target, type: ['a', 'b'], listener });

		target.dispatchEvent(new Event('a'));
		expect(listener).not.toHaveBeenCalled();

		controller.attach();
		target.dispatchEvent(new Event('a'));
		target.dispatchEvent(new Event('b'));
		expect(listener).toHaveBeenCalledTimes(2);

		controller.destroy();
		target.dispatchEvent(new Event('a'));
		target.dispatchEvent(new Event('b'));
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it('is idempotent and can attach again after destroy', () => {
		const target = new EventTarget();
		const listener = vi.fn();
		const controller = new EventListenerController({ getTarget: () => target, type: 'a', listener });

		controller.attach();
		controller.attach();
		target.dispatchEvent(new Event('a'));
		expect(listener).toHaveBeenCalledTimes(1);

		controller.destroy();
		controller.destroy();
		controller.attach();
		target.dispatchEvent(new Event('a'));
		expect(listener).toHaveBeenCalledTimes(2);
		controller.destroy();
	});

	it('removes a capture listener with the options it added it with', () => {
		const parent = document.createElement('div');
		const child = document.createElement('span');
		parent.append(child);
		const listener = vi.fn();
		const controller = new EventListenerController({
			getTarget: () => parent,
			type: 'click',
			listener,
			options: { capture: true },
		});

		controller.attach();
		child.dispatchEvent(new Event('click'));
		expect(listener).toHaveBeenCalledTimes(1);

		controller.destroy();
		child.dispatchEvent(new Event('click'));
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('hears an event named in a typed map without a cast', () => {
		const listener = vi.fn((event: PointerEvent) => event.pointerId);
		const controller = new EventListenerController({ getTarget: () => document, type: 'pointermove', listener });

		controller.attach();
		document.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7 }));

		expect(listener).toHaveReturnedWith(7);
		controller.destroy();
	});

	it('listens to a media query list and reads matches from the typed event', () => {
		const query = window.matchMedia('(min-width: 1px)');
		const seen: boolean[] = [];
		const controller = new EventListenerController({
			getTarget: () => query,
			type: 'change',
			listener: (event) => seen.push(event.matches),
		});

		controller.attach();
		query.dispatchEvent(new MediaQueryListEvent('change', { matches: true }));
		controller.destroy();
		query.dispatchEvent(new MediaQueryListEvent('change', { matches: false }));

		expect(seen).toEqual([true]);
	});

	it('passes once through to the listener', () => {
		const target = new EventTarget();
		const listener = vi.fn();
		const controller = new EventListenerController({
			getTarget: () => target,
			type: 'a',
			listener,
			options: { once: true },
		});

		controller.attach();
		target.dispatchEvent(new Event('a'));
		target.dispatchEvent(new Event('a'));
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('detaches after a once listener fires, so attach registers it again', () => {
		const target = new EventTarget();
		const listener = vi.fn();
		const controller = new EventListenerController({
			getTarget: () => target,
			type: ['a', 'b'],
			listener,
			options: { once: true },
		});

		controller.attach();
		target.dispatchEvent(new Event('a'));
		target.dispatchEvent(new Event('b'));
		expect(listener).toHaveBeenCalledTimes(1);

		controller.attach();
		target.dispatchEvent(new Event('b'));
		target.dispatchEvent(new Event('a'));
		expect(listener).toHaveBeenCalledTimes(2);

		controller.destroy();
		target.dispatchEvent(new Event('a'));
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it('moves to a new target when attached again and attaches nothing without one', () => {
		let target: EventTarget | null = new EventTarget();
		const first = target;
		const second = new EventTarget();
		const listener = vi.fn();
		const controller = new EventListenerController({ getTarget: () => target, type: 'a', listener });

		controller.attach();
		target = second;
		controller.attach();
		first.dispatchEvent(new Event('a'));
		expect(listener).not.toHaveBeenCalled();
		second.dispatchEvent(new Event('a'));
		expect(listener).toHaveBeenCalledTimes(1);

		target = null;
		controller.attach();
		second.dispatchEvent(new Event('a'));
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('is bound to a host by its factory', () => {
		const connected: Array<() => void> = [];
		const cleanup: Array<() => void> = [];
		const target = new EventTarget();
		const listener = vi.fn();
		createEventListenerController(
			{
				registerConnectedCallback: (callback) => connected.push(callback),
				registerCleanupCallback: (callback) => cleanup.push(callback),
			},
			{ getTarget: () => target, type: 'a', listener },
		);

		connected.forEach((callback) => callback());
		target.dispatchEvent(new Event('a'));
		expect(listener).toHaveBeenCalledTimes(1);

		cleanup.forEach((callback) => callback());
		target.dispatchEvent(new Event('a'));
		expect(listener).toHaveBeenCalledTimes(1);
	});
});
