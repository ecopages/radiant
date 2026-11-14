import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResizeController, createResizeController } from './resize-controller';

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

describe('ResizeController', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	function mount(): HTMLElement {
		const element = document.createElement('div');
		element.style.width = '10px';
		element.style.height = '10px';
		document.body.append(element);
		return element;
	}

	it('reports size changes between attach and destroy and nothing after', async () => {
		const element = mount();
		const onResize = vi.fn();
		const controller = new ResizeController({ getTargets: () => [element], onResize });

		controller.attach();
		await frame();
		const initial = onResize.mock.calls.length;
		expect(initial).toBeGreaterThan(0);

		element.style.width = '40px';
		await frame();
		expect(onResize.mock.calls.length).toBeGreaterThan(initial);

		controller.destroy();
		const afterDestroy = onResize.mock.calls.length;
		element.style.width = '80px';
		await frame();
		expect(onResize).toHaveBeenCalledTimes(afterDestroy);
	});

	it('observes every non-null target and tolerates repeated attach and destroy', async () => {
		const first = mount();
		const second = mount();
		const onResize = vi.fn();
		const controller = new ResizeController({ getTargets: () => [first, null, second], onResize });

		controller.attach();
		controller.attach();
		await frame();
		const seen = new Set(
			onResize.mock.calls.flatMap(([entries]) => entries.map((entry: ResizeObserverEntry) => entry.target)),
		);
		expect(seen).toEqual(new Set([first, second]));

		controller.destroy();
		expect(() => controller.destroy()).not.toThrow();
	});

	it('moves to the targets getTargets returns when attached again, and keeps the observer for the same ones', async () => {
		const first = mount();
		const second = mount();
		let current = first;
		const onResize = vi.fn();
		const controller = new ResizeController({ getTargets: () => [current], onResize });

		controller.attach();
		await frame();
		onResize.mockClear();
		controller.attach();
		await frame();
		expect(onResize).not.toHaveBeenCalled();

		current = second;
		controller.attach();
		await frame();
		onResize.mockClear();
		first.style.width = '50px';
		second.style.width = '50px';
		await frame();
		const seen = onResize.mock.calls.flatMap(([entries]) =>
			entries.map((entry: ResizeObserverEntry) => entry.target),
		);
		expect(seen).toEqual([second]);

		controller.destroy();
	});

	it('is bound to a host by its factory', async () => {
		const connected: Array<() => void> = [];
		const cleanup: Array<() => void> = [];
		const element = mount();
		const onResize = vi.fn();
		createResizeController(
			{
				registerConnectedCallback: (callback) => connected.push(callback),
				registerCleanupCallback: (callback) => cleanup.push(callback),
			},
			{ getTargets: () => [element], onResize },
		);

		connected.forEach((callback) => callback());
		await frame();
		expect(onResize).toHaveBeenCalled();

		cleanup.forEach((callback) => callback());
		const afterCleanup = onResize.mock.calls.length;
		element.style.width = '90px';
		await frame();
		expect(onResize).toHaveBeenCalledTimes(afterCleanup);
	});
});
