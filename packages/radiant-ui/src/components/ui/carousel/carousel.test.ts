import { afterEach, describe, expect, it } from 'vitest';
import { RuiCarousel } from './carousel.script';

async function mountCarousel(slidesPerView = 3, autoplay = false): Promise<RuiCarousel> {
	const host = new RuiCarousel();
	host.setAttribute('slides-per-view', String(slidesPerView));
	host.setAttribute('show-indicators', '');
	host.setAttribute('interval', '60000');
	if (autoplay) host.setAttribute('autoplay', '');
	host.innerHTML = `<section data-ref="root"><div data-ref="viewport"><div data-ref="track">${Array.from({ length: 5 }, (_, i) => `<div data-slide="${i}">${i}</div>`).join('')}</div></div><div data-ref="indicators"></div></section>`;
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
		expect(host.querySelectorAll('[data-carousel-indicator]')).toHaveLength(3);
		expect(host.querySelector('[role="tabpanel"]')).toBeNull();
		expect(host.querySelector('[data-slide]')?.hasAttribute('aria-labelledby')).toBe(false);
		host.slidesPerView = 1;
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
