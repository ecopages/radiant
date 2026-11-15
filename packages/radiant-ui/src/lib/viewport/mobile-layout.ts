import { MOBILE_LAYOUT_MAX_WIDTH_PX } from './breakpoints';

export { MOBILE_LAYOUT_MAX_WIDTH_PX };

/**
 * @remarks
 * SSR and non-browser environments return `false`.
 */
export function isMobileLayoutViewport(): boolean {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return false;
	}
	return window.matchMedia(`(max-width: ${MOBILE_LAYOUT_MAX_WIDTH_PX}px)`).matches;
}

/**
 * Collapses multi-month calendars to one month on narrow viewports so popovers fit.
 */
export function effectiveVisibleMonths(requested: number): number {
	if (requested <= 1 || !isMobileLayoutViewport()) {
		return requested;
	}
	return 1;
}
