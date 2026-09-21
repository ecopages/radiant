import { afterEach, describe, expect, it, vi } from 'vitest';
import { MOBILE_LAYOUT_MAX_WIDTH_PX, effectiveVisibleMonths, isMobileLayoutViewport } from './mobile-layout';

function stubMatchMedia(matches: boolean): void {
	vi.stubGlobal(
		'matchMedia',
		vi.fn((query: string) => {
			expect(query).toBe(`(max-width: ${MOBILE_LAYOUT_MAX_WIDTH_PX}px)`);
			return {
				matches,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			} as unknown as MediaQueryList;
		}),
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('effectiveVisibleMonths', () => {
	it('returns the requested count on wide viewports', () => {
		stubMatchMedia(false);
		expect(effectiveVisibleMonths(2)).toBe(2);
		expect(effectiveVisibleMonths(1)).toBe(1);
	});

	it('collapses to one month on narrow viewports when requested is greater than one', () => {
		stubMatchMedia(true);
		expect(effectiveVisibleMonths(2)).toBe(1);
		expect(effectiveVisibleMonths(3)).toBe(1);
	});

	it('keeps a single month on narrow viewports', () => {
		stubMatchMedia(true);
		expect(effectiveVisibleMonths(1)).toBe(1);
	});
});

describe('isMobileLayoutViewport', () => {
	it('returns false when matchMedia is unavailable', () => {
		vi.stubGlobal('matchMedia', undefined);
		expect(isMobileLayoutViewport()).toBe(false);
	});
});
