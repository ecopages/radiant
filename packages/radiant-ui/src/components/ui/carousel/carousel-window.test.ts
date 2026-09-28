import { describe, expect, it } from 'vitest';
import {
	advanceIndex,
	carouselGapCount,
	clampIndex,
	clampSlidesPerGroup,
	clampSlidesPerView,
	isSlideInView,
	maxStartIndex,
	resolveCarouselSurface,
	resolveCarouselTrackMode,
	resolveCarouselWindow,
	visualStartIndex,
} from './carousel-window';

describe('clampSlidesPerView', () => {
	it('collapses invalid values to a single pane', () => {
		expect(clampSlidesPerView(Number.NaN)).toBe(1);
		expect(clampSlidesPerView(0)).toBe(1);
		expect(clampSlidesPerView(0.5)).toBe(1);
	});

	it('keeps fractional peek values at or above 1', () => {
		expect(clampSlidesPerView(1)).toBe(1);
		expect(clampSlidesPerView(1.2)).toBe(1.2);
		expect(clampSlidesPerView(3)).toBe(3);
	});
});

describe('clampSlidesPerGroup', () => {
	it('truncates toward a whole-slide step of at least 1', () => {
		expect(clampSlidesPerGroup(Number.NaN)).toBe(1);
		expect(clampSlidesPerGroup(0)).toBe(1);
		expect(clampSlidesPerGroup(1.9)).toBe(1);
		expect(clampSlidesPerGroup(2.2)).toBe(2);
	});
});

describe('maxStartIndex', () => {
	it('leaves a full window against the last slide', () => {
		expect(maxStartIndex(8, 3)).toBe(5);
		expect(maxStartIndex(5, 1)).toBe(4);
		expect(maxStartIndex(5, 5)).toBe(0);
	});

	it('does not scroll when every slide already fits', () => {
		expect(maxStartIndex(2, 3)).toBe(0);
		expect(maxStartIndex(0, 3)).toBe(0);
	});

	it('uses the integer visible count for a fractional peek', () => {
		expect(maxStartIndex(5, 2.5)).toBe(3);
	});
});

describe('clampIndex', () => {
	it('clamps to the window-start range', () => {
		expect(clampIndex(-1, 8, 3)).toBe(0);
		expect(clampIndex(5, 8, 3)).toBe(5);
		expect(clampIndex(7, 8, 3)).toBe(5);
		expect(clampIndex(4, 3, 1)).toBe(2);
	});
});

describe('isSlideInView', () => {
	it('includes partially visible slides in a fractional window', () => {
		expect(isSlideInView(0, 0, 6, 1.2)).toBe(true);
		expect(isSlideInView(1, 0, 6, 1.2)).toBe(true);
		expect(isSlideInView(2, 0, 6, 1.2)).toBe(false);
	});

	it('treats the window as half-open at the end', () => {
		expect(isSlideInView(2, 0, 8, 3)).toBe(true);
		expect(isSlideInView(3, 0, 8, 3)).toBe(false);
		expect(isSlideInView(5, 5, 8, 3)).toBe(true);
	});

	it('includes the previous card when a peek flushes the last card to the right', () => {
		expect(isSlideInView(4, 5, 6, 1.2)).toBe(true);
		expect(isSlideInView(5, 5, 6, 1.2)).toBe(true);
		expect(isSlideInView(3, 5, 6, 1.2)).toBe(false);
	});
});

describe('visualStartIndex', () => {
	it('stays on index until a fractional peek would leave empty space at the end', () => {
		expect(visualStartIndex(0, 6, 1.2)).toBe(0);
		expect(visualStartIndex(4, 6, 1.2)).toBe(4);
		expect(visualStartIndex(5, 6, 1.2)).toBeCloseTo(4.8);
	});
});

describe('resolveCarouselTrackMode', () => {
	it('keeps single-pane transitions', () => {
		expect(resolveCarouselTrackMode('none', 1)).toBe('swap');
		expect(resolveCarouselTrackMode('fade', 1)).toBe('stack');
		expect(resolveCarouselTrackMode('slide', 1)).toBe('window');
	});

	it('falls back to a sliding track when more than one slide is shown', () => {
		expect(resolveCarouselTrackMode('none', 3)).toBe('window');
		expect(resolveCarouselTrackMode('fade', 1.2)).toBe('window');
		expect(resolveCarouselTrackMode('slide', 3)).toBe('window');
	});
});

describe('resolveCarouselSurface', () => {
	it('keeps a single pane as the shell card', () => {
		expect(resolveCarouselSurface(1)).toBe('shell');
		expect(resolveCarouselSurface(0.5)).toBe('shell');
	});

	it('paints separate cards when more than one slide is shown', () => {
		expect(resolveCarouselSurface(1.2)).toBe('cards');
		expect(resolveCarouselSurface(3)).toBe('cards');
	});
});

describe('carouselGapCount', () => {
	it('counts gaps between visible cards including peek', () => {
		expect(carouselGapCount(1)).toBe(0);
		expect(carouselGapCount(1.2)).toBe(1);
		expect(carouselGapCount(2.5)).toBe(2);
		expect(carouselGapCount(3)).toBe(2);
	});
});

describe('resolveCarouselWindow', () => {
	it('normalizes index and reports end-state for controls', () => {
		const window = resolveCarouselWindow({
			index: 9,
			count: 8,
			slidesPerView: 3,
			slidesPerGroup: 3,
			wrap: false,
		});

		expect(window.index).toBe(5);
		expect(window.maxStartIndex).toBe(5);
		expect(window.canGoPrev).toBe(true);
		expect(window.canGoNext).toBe(false);
		expect(window.slidesPerGroup).toBe(3);
	});
});

describe('advanceIndex', () => {
	const base = {
		count: 8,
		slidesPerView: 3,
		slidesPerGroup: 3,
		wrap: false,
	};

	it('moves by group and clamps at the last window start', () => {
		expect(advanceIndex({ ...base, index: 0 }, 1)).toBe(3);
		expect(advanceIndex({ ...base, index: 3 }, 1)).toBe(5);
		expect(advanceIndex({ ...base, index: 3 }, -1)).toBe(0);
	});

	it('wraps a single-slide step like a one-pane carousel', () => {
		const single = { ...base, slidesPerView: 1, slidesPerGroup: 1, count: 3, wrap: true };
		expect(advanceIndex({ ...single, index: 2 }, 1)).toBe(0);
		expect(advanceIndex({ ...single, index: 0 }, -1)).toBe(2);
	});
});
