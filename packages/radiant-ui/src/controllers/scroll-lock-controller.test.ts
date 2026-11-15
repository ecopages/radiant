import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ControllerHost } from './controller';
import { ScrollLockController, createScrollLockController } from './scroll-lock-controller';

describe('ScrollLockController', () => {
	/** The test browser hides scrollbars, so a 15px one is simulated through the width the page reports. */
	function showScrollbar(): number {
		vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(document.documentElement.clientWidth + 15);
		return 15;
	}

	const locks: ScrollLockController[] = [];

	function lockOf(target?: HTMLElement): ScrollLockController {
		const lock = new ScrollLockController(target ? { getTarget: () => target } : undefined);
		locks.push(lock);
		return lock;
	}

	afterEach(() => {
		locks.splice(0).forEach((lock) => lock.destroy());
		vi.restoreAllMocks();
		document.documentElement.removeAttribute('style');
		document.body.removeAttribute('style');
	});

	it('hides page overflow while attached and restores the previous inline values on destroy', () => {
		document.documentElement.style.overflow = 'auto';
		document.body.style.paddingRight = '3px';
		const lock = lockOf();

		lock.attach();
		expect(document.documentElement.style.overflow).toBe('hidden');

		lock.destroy();
		expect(document.documentElement.style.overflow).toBe('auto');
		expect(document.body.style.paddingRight).toBe('3px');
	});

	it('pads the body by the scrollbar width so the layout does not shift', () => {
		const gap = showScrollbar();
		const lock = lockOf();

		lock.attach();
		expect(document.body.style.paddingRight).toBe(`${gap}px`);

		lock.destroy();
		expect(document.body.style.paddingRight).toBe('');
	});

	it('adds the scrollbar width to padding the body already has', () => {
		document.body.style.paddingRight = '10px';
		const gap = showScrollbar();
		const lock = lockOf();

		lock.attach();
		expect(document.body.style.paddingRight).toBe(`${10 + gap}px`);

		lock.destroy();
		expect(document.body.style.paddingRight).toBe('10px');
	});

	it('keeps the page locked until the last of several overlapping locks releases', () => {
		const outer = lockOf();
		const inner = lockOf();

		outer.attach();
		inner.attach();
		inner.destroy();
		expect(document.documentElement.style.overflow).toBe('hidden');

		outer.destroy();
		expect(document.documentElement.style.overflow).toBe('');
	});

	it('keeps the page locked when the locks release outermost first', () => {
		const outer = lockOf();
		const inner = lockOf();

		outer.attach();
		inner.attach();
		outer.destroy();
		expect(document.documentElement.style.overflow).toBe('hidden');

		inner.destroy();
		expect(document.documentElement.style.overflow).toBe('');
	});

	it('counts one lock per controller however often it attaches or destroys', () => {
		const first = lockOf();
		const second = lockOf();

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

	describe('with a scroll container as the target', () => {
		function scroller(): HTMLElement {
			const element = document.createElement('div');
			element.style.overflow = 'auto';
			document.body.append(element);
			return element;
		}

		afterEach(() => {
			document.body.replaceChildren();
		});

		it('locks that element and leaves the page alone, then restores its inline overflow', () => {
			const element = scroller();
			const lock = lockOf(element);

			lock.attach();
			expect(element.style.overflow).toBe('hidden');
			expect(document.documentElement.style.overflow).toBe('');

			lock.destroy();
			expect(element.style.overflow).toBe('auto');
		});

		it('pads the element by the scrollbar width that disappears, not counting its borders', () => {
			const element = scroller();
			element.style.border = '2px solid';
			Object.defineProperty(element, 'offsetWidth', { value: element.clientWidth + 4 + 15 });
			const lock = lockOf(element);

			lock.attach();
			expect(element.style.paddingRight).toBe('15px');
			expect(document.body.style.paddingRight).toBe('');

			lock.destroy();
			expect(element.style.paddingRight).toBe('');
		});

		it('keeps locks on different elements independent, and counts holders of the same element', () => {
			const first = scroller();
			const second = scroller();
			const a = lockOf(first);
			const b = lockOf(first);
			const c = lockOf(second);

			a.attach();
			b.attach();
			c.attach();
			c.destroy();
			expect(second.style.overflow).toBe('auto');
			a.destroy();
			expect(first.style.overflow).toBe('hidden');
			b.destroy();
			expect(first.style.overflow).toBe('auto');
		});
	});

	it('is bound to a host through createScrollLockController', () => {
		const connected: Array<() => void> = [];
		const cleanup: Array<() => void> = [];
		const host: ControllerHost = {
			registerConnectedCallback: (callback) => connected.push(callback),
			registerCleanupCallback: (callback) => cleanup.push(callback),
		};

		const bound = createScrollLockController(host);
		locks.push(bound);
		expect(document.documentElement.style.overflow).toBe('');

		connected.forEach((callback) => callback());
		expect(document.documentElement.style.overflow).toBe('hidden');

		cleanup.forEach((callback) => callback());
		expect(document.documentElement.style.overflow).toBe('');
	});
});
