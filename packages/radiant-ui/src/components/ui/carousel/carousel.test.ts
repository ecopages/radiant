import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { RuiCarousel } from './carousel.script';

async function mountCarousel(slidesPerView = 3, autoplay = false, interval = 60000): Promise<RuiCarousel> {
	const host = new RuiCarousel();
	host.setAttribute('slides-per-view', String(slidesPerView));
	host.setAttribute('show-indicators', '');
	host.setAttribute('interval', String(interval));
	if (autoplay) host.setAttribute('autoplay', '');
	host.innerHTML = `<section class="rui-carousel rui-carousel--none rui-carousel--controls-toolbar" data-ref="root"><div data-ref="viewport"><div data-ref="track">${Array.from({ length: 5 }, (_, i) => `<div data-slide="${i}">${i}</div>`).join('')}</div></div><div data-ref="indicators"></div></section>`;
	document.body.append(host);
	await new Promise((resolve) => setTimeout(resolve, 0));
	return host;
}

afterEach(() => {
	document.body.replaceChildren();
});

describe('carousel indicators', () => {
	it('selects and focuses every valid window, including the last', async () => {
		const host = await mountCarousel();
		const indicators = [...host.querySelectorAll<HTMLButtonElement>('[data-carousel-indicator]')];
		expect(indicators).toHaveLength(3);
		expect(host.querySelector('[data-ref="indicators"]')?.getAttribute('role')).toBe('group');
		for (const [index, indicator] of indicators.entries()) {
			indicator.click();
			expect(host.index).toBe(index);
			expect(indicator.getAttribute('aria-current')).toBe('true');
			expect(document.activeElement).toBe(indicator);
			const controlled = indicator.getAttribute('aria-controls')?.split(' ') ?? [];
			expect(controlled).toHaveLength(3);
			for (const id of controlled) expect(document.getElementById(id)?.getAttribute('aria-hidden')).toBe('false');
		}
		indicators[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
		expect(document.activeElement).toBe(indicators[0]);
		indicators[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
		expect(document.activeElement).toBe(indicators[2]);
		expect(host.index).toBe(2);
	});

	it('updates indicator roles and relationships when the window size changes', async () => {
		const host = await mountCarousel(1);
		expect(host.querySelectorAll('[role="tab"]')).toHaveLength(5);
		host.slidesPerView = 3;
		await host.updateComplete;
		expect(host.querySelectorAll('[data-carousel-indicator]')).toHaveLength(3);
		expect(host.querySelector('[role="tabpanel"]')).toBeNull();
		expect(host.querySelector('[data-slide]')?.hasAttribute('aria-labelledby')).toBe(false);
		host.slidesPerView = 1;
		await host.updateComplete;
		expect(host.querySelectorAll('[role="tab"]')).toHaveLength(5);
		for (const panel of host.querySelectorAll('[role="tabpanel"]')) {
			expect(document.getElementById(panel.getAttribute('aria-labelledby') ?? '')).not.toBeNull();
		}
	});
});

describe('carousel live region', () => {
	it.each(['focus', 'hover', 'navigation'] as const)(
		'restores announcements when %s stops rotation',
		async (action) => {
			const host = await mountCarousel(1, true);
			const viewport = host.querySelector('[data-ref="viewport"]');
			expect(viewport?.getAttribute('aria-live')).toBe('off');
			if (action === 'focus') host.onRootFocusIn();
			if (action === 'hover') host.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
			if (action === 'navigation') host.next();
			expect(viewport?.getAttribute('aria-live')).toBe('polite');
		},
	);
});

describe('carousel pointer isolation', () => {
	it('mounts rotating after an earlier carousel was hovered', async () => {
		const first = await mountCarousel(1, true);
		await userEvent.hover(first);
		document.body.replaceChildren();
		await userEvent.unhover(document.body);
		const next = await mountCarousel(1, true);
		expect(next.querySelector('[data-ref="viewport"]')?.getAttribute('aria-live')).toBe('off');
	});
});

describe('carousel autoplay pause sources', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	const mouse = (type: 'pointerenter' | 'pointerleave') => new PointerEvent(type, { pointerType: 'mouse' });

	async function mountFake(): Promise<RuiCarousel> {
		vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
		return mountCarousel(1, true, 20);
	}

	it('pauses while the mouse is over the carousel and resumes on leave', async () => {
		const host = await mountFake();
		host.dispatchEvent(mouse('pointerenter'));
		const held = host.index;
		vi.advanceTimersByTime(25);
		expect(host.index).toBe(held);

		host.dispatchEvent(mouse('pointerleave'));
		vi.advanceTimersByTime(25);
		expect(host.index).not.toBe(held);
	});

	it('stays paused when the mouse leaves while focus is still inside', async () => {
		const host = await mountFake();
		host.onRootFocusIn();
		host.dispatchEvent(mouse('pointerenter'));
		host.dispatchEvent(mouse('pointerleave'));
		const held = host.index;
		vi.advanceTimersByTime(25);
		expect(host.index).toBe(held);
	});

	it('stays paused when focus leaves while the mouse is still over', async () => {
		const host = await mountFake();
		host.dispatchEvent(mouse('pointerenter'));
		host.onRootFocusIn();
		host.onRootFocusOut(new FocusEvent('focusout', { relatedTarget: null }));
		const held = host.index;
		vi.advanceTimersByTime(25);
		expect(host.index).toBe(held);
	});
});

describe('carousel transition class', () => {
	it('swaps the animation class when transition changes', async () => {
		const host = await mountCarousel(1);
		const root = host.querySelector<HTMLElement>('[data-ref="root"]')!;
		host.transition = 'fade';
		await host.updateComplete;
		expect(root.classList.contains('rui-carousel--fade')).toBe(true);
		expect(root.classList.contains('rui-carousel--none')).toBe(false);
		expect(root.classList.contains('rui-carousel--controls-toolbar')).toBe(true);
		host.transition = 'slide';
		await host.updateComplete;
		expect(root.classList.contains('rui-carousel--slide')).toBe(true);
		expect(root.classList.contains('rui-carousel--fade')).toBe(false);
	});
});

describe('carousel transition validation', () => {
	it('adds no class for an invalid transition', async () => {
		const host = await mountCarousel(1);
		const root = host.querySelector<HTMLElement>('[data-ref="root"]')!;
		host.transition = 'wobble' as never;
		await host.updateComplete;
		expect([...root.classList].some((name) => name.includes('wobble'))).toBe(false);
		expect(root.classList.contains('rui-carousel--none')).toBe(false);
	});

	it('applies the transition class with zero slides', async () => {
		const host = new RuiCarousel();
		host.setAttribute('transition', 'fade');
		host.innerHTML =
			'<section class="rui-carousel" data-ref="root"><div data-ref="viewport"><div data-ref="track"></div></div></section>';
		document.body.append(host);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(host.querySelector('[data-ref="root"]')!.classList.contains('rui-carousel--fade')).toBe(true);
	});
});

describe('carousel swipe', () => {
	const swipe = (viewport: Element, from: number, to: number) => {
		const init = { bubbles: true, pointerId: 1, button: 0, clientY: 0 };
		viewport.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientX: from }));
		viewport.dispatchEvent(new PointerEvent('pointerup', { ...init, clientX: to }));
	};

	it('moves to the next slide on a left swipe and back on a right swipe', async () => {
		const host = await mountCarousel(1);
		const viewport = host.querySelector('[data-ref="viewport"]')!;

		swipe(viewport, 200, 100);
		expect(host.index).toBe(1);
		swipe(viewport, 100, 200);
		expect(host.index).toBe(0);
	});

	it('swipes a viewport that arrives after the host connected', async () => {
		const host = new RuiCarousel();
		host.setAttribute('slides-per-view', '1');
		document.body.append(host);
		host.innerHTML = `<section class="rui-carousel" data-ref="root"><div data-ref="viewport"><div data-ref="track">${Array.from({ length: 5 }, (_, i) => `<div data-slide="${i}">${i}</div>`).join('')}</div></div></section>`;
		await new Promise((resolve) => setTimeout(resolve, 0));

		swipe(host.querySelector('[data-ref="viewport"]')!, 200, 100);
		expect(host.index).toBe(1);
	});

	it('flips the direction in a right-to-left carousel', async () => {
		const host = await mountCarousel(1);
		host.dir = 'rtl';
		const viewport = host.querySelector('[data-ref="viewport"]')!;

		swipe(viewport, 100, 200);
		expect(host.index).toBe(1);
	});

	it('ignores a swipe that starts on a button and stops listening once disconnected', async () => {
		const host = await mountCarousel(1);
		const viewport = host.querySelector('[data-ref="viewport"]')!;
		const button = document.createElement('button');
		viewport.append(button);

		swipe(button, 200, 100);
		expect(host.index).toBe(0);

		host.remove();
		swipe(viewport, 200, 100);
		expect(host.index).toBe(0);
	});
});
