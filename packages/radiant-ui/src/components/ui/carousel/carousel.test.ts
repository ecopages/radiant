import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'storybook/test';
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
			if (action === 'hover') host.onRootPointerEnter(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
			if (action === 'navigation') host.next();
			expect(viewport?.getAttribute('aria-live')).toBe('polite');
		},
	);
});

describe('carousel autoplay hover', () => {
	it('pauses while the mouse is over the carousel and resumes on leave', async () => {
		const host = await mountCarousel(1, true, 20);
		const root = host.querySelector<HTMLElement>('[data-ref="root"]')!;
		const tick = () => new Promise((resolve) => setTimeout(resolve, 70));

		await userEvent.hover(root);
		const held = host.index;
		await tick();
		expect(host.index).toBe(held);

		await userEvent.unhover(root);
		await tick();
		expect(host.index).not.toBe(held);
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
