import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ControllerHost } from './controller';
import { ScrollLockController, createScrollLockController } from './scroll-lock-controller';

describe('ScrollLockController', () => {
	/** The test browser hides scrollbars, so a 15px one is simulated through the width the page reports. */
	function showScrollbar(): number {
		vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(document.documentElement.clientWidth + 15);
		return 15;
	}

	afterEach(() => {
		vi.restoreAllMocks();
		document.documentElement.removeAttribute('style');
		document.body.removeAttribute('style');
	});

	it('hides page overflow while attached and restores the previous inline values on destroy', () => {
		document.documentElement.style.overflow = 'auto';
		document.body.style.paddingRight = '3px';
		const lock = new ScrollLockController();

		lock.attach();
		expect(document.documentElement.style.overflow).toBe('hidden');

		lock.destroy();
		expect(document.documentElement.style.overflow).toBe('auto');
		expect(document.body.style.paddingRight).toBe('3px');
	});

	it('pads the body by the scrollbar width so the layout does not shift', () => {
		const gap = showScrollbar();
		const lock = new ScrollLockController();

		lock.attach();
		expect(document.body.style.paddingRight).toBe(`${gap}px`);

		lock.destroy();
		expect(document.body.style.paddingRight).toBe('');
	});

	it('adds the scrollbar width to padding the body already has', () => {
		document.body.style.paddingRight = '10px';
		const gap = showScrollbar();
		const lock = new ScrollLockController();

		lock.attach();
		expect(document.body.style.paddingRight).toBe(`${10 + gap}px`);

		lock.destroy();
		expect(document.body.style.paddingRight).toBe('10px');
	});

	it('keeps the page locked until the last of several overlapping locks releases', () => {
		const outer = new ScrollLockController();
		const inner = new ScrollLockController();

		outer.attach();
		inner.attach();
		inner.destroy();
		expect(document.documentElement.style.overflow).toBe('hidden');

		outer.destroy();
		expect(document.documentElement.style.overflow).toBe('');
	});

	it('keeps the page locked when the locks release outermost first', () => {
		const outer = new ScrollLockController();
		const inner = new ScrollLockController();

		outer.attach();
		inner.attach();
		outer.destroy();
		expect(document.documentElement.style.overflow).toBe('hidden');

		inner.destroy();
		expect(document.documentElement.style.overflow).toBe('');
	});

	it('counts one lock per controller however often it attaches or destroys', () => {
		const first = new ScrollLockController();
		const second = new ScrollLockController();

		first.attach();
		first.attach();
		second.attach();
		first.destroy();
		first.destroy();
		expect(document.documentElement.style.overflow).toBe('hidden');

		second.destroy();
		expect(document.documentElement.style.overflow).toBe('');

		first.attach();
		expect(document.documentElement.style.overflow).toBe('hidden');
		first.destroy();
	});

	it('is bound to a host through createScrollLockController', () => {
		const connected: Array<() => void> = [];
		const cleanup: Array<() => void> = [];
		const host: ControllerHost = {
			registerConnectedCallback: (callback) => connected.push(callback),
			registerCleanupCallback: (callback) => cleanup.push(callback),
		};

		expect(createScrollLockController(host)).toBeInstanceOf(ScrollLockController);
		expect(document.documentElement.style.overflow).toBe('');

		connected.forEach((callback) => callback());
		expect(document.documentElement.style.overflow).toBe('hidden');

		cleanup.forEach((callback) => callback());
		expect(document.documentElement.style.overflow).toBe('');
	});
});
