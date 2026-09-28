import { MOBILE_LAYOUT_MAX_WIDTH_PX } from '@/lib/viewport/mobile-layout';
import { expect } from 'storybook/test';

/**
 * Asserts an element does not overflow horizontally inside its box.
 *
 * @remarks
 * Use in story `play` functions to catch fixed min-widths and flex input blowout without
 * pixel-based screenshot services.
 */
export function expectFitsHorizontally(element: HTMLElement, tolerancePx = 1): void {
	expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth + tolerancePx);
}

/**
 * Asserts computed `font-size` is at least `minPx` (16px avoids iOS focus zoom).
 */
export function expectMinFontSizePx(element: Element, minPx: number): void {
	const px = Number.parseFloat(getComputedStyle(element).fontSize);
	expect(px).toBeGreaterThanOrEqual(minPx);
}

/**
 * Asserts control input typography matches the viewport breakpoint (`--text-control-input`).
 */
export function expectControlInputFontSize(element: Element): void {
	const minPx = window.matchMedia(`(max-width: ${MOBILE_LAYOUT_MAX_WIDTH_PX}px)`).matches ? 16 : 14;
	expectMinFontSizePx(element, minPx);
}

/**
 * Asserts a positioned surface stays within the viewport with optional padding.
 */
export function expectWithinViewport(element: HTMLElement, paddingPx = 8): void {
	const rect = element.getBoundingClientRect();
	const tolerance = 1;
	expect(rect.left).toBeGreaterThanOrEqual(paddingPx - tolerance);
	expect(rect.right).toBeLessThanOrEqual(window.innerWidth - paddingPx + tolerance);
	expect(rect.top).toBeGreaterThanOrEqual(paddingPx - tolerance);
	expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight - paddingPx + tolerance);
}
