export type CarouselTrackMode = 'swap' | 'stack' | 'window';

export type CarouselSurface = 'shell' | 'cards';

export type CarouselWindowParams = {
	index: number;
	count: number;
	slidesPerView: number;
	slidesPerGroup: number;
	wrap: boolean;
};

export type CarouselWindow = {
	index: number;
	slidesPerView: number;
	slidesPerGroup: number;
	maxStartIndex: number;
	canGoPrev: boolean;
	canGoNext: boolean;
};

/**
 * How many slides fill the viewport. Values below 1 collapse to a single pane.
 */
export function clampSlidesPerView(value: number): number {
	if (!Number.isFinite(value) || value < 1) {
		return 1;
	}

	return value;
}

/**
 * How many slides prev/next/autoplay move. Fractional input truncates toward zero.
 */
export function clampSlidesPerGroup(value: number): number {
	if (!Number.isFinite(value) || value < 1) {
		return 1;
	}

	return Math.floor(value);
}

/**
 * Last valid window-start index so the viewport still has content.
 *
 * @remarks Integer `index` cannot flush a fractional peek against the end;
 * `floor(slidesPerView)` is the visible count used for that bound. The track
 * translate still clamps so the last card sits on the right edge.
 */
export function maxStartIndex(count: number, slidesPerView: number): number {
	if (count <= 0) {
		return 0;
	}

	return Math.max(0, count - Math.floor(clampSlidesPerView(slidesPerView)));
}

/** Clamp an authored or requested index to a valid window start. */
export function clampIndex(raw: number, count: number, slidesPerView: number): number {
	if (count <= 0 || !Number.isFinite(raw)) {
		return 0;
	}

	const maxStart = maxStartIndex(count, slidesPerView);
	return Math.min(Math.max(Math.trunc(raw), 0), maxStart);
}

/**
 * First slide overlapping the viewport. Near the end this moves left of `index`
 * so a fractional peek shows the previous card and the last full card sits flush right.
 */
export function visualStartIndex(index: number, count: number, slidesPerView: number): number {
	const perView = clampSlidesPerView(slidesPerView);
	const start = clampIndex(index, count, perView);
	return Math.min(start, Math.max(0, count - perView));
}

export function isSlideInView(slideIndex: number, index: number, count: number, slidesPerView: number): boolean {
	const perView = clampSlidesPerView(slidesPerView);
	const start = visualStartIndex(index, count, perView);
	return slideIndex + 1 > start && slideIndex < start + perView;
}

/**
 * Track layout the host paints. A window of more than one slide cannot swap or
 * cross-fade, so those transitions fall back to a sliding track.
 */
export function resolveCarouselTrackMode(
	transition: 'none' | 'slide' | 'fade',
	slidesPerView: number,
): CarouselTrackMode {
	if (clampSlidesPerView(slidesPerView) > 1) {
		return 'window';
	}

	if (transition === 'fade') {
		return 'stack';
	}

	if (transition === 'slide') {
		return 'window';
	}

	return 'swap';
}

/**
 * One pane keeps chrome on the viewport. More than one slide paints each slide
 * as a card with `--rui-carousel-gap` between them.
 */
export function resolveCarouselSurface(slidesPerView: number): CarouselSurface {
	return clampSlidesPerView(slidesPerView) > 1 ? 'cards' : 'shell';
}

/**
 * Gaps visible in the window, including a peek of the next card.
 *
 * @remarks `slidesPerView` 3 → 2 gaps; `1.2` → 1 gap between the card and the peek.
 */
export function carouselGapCount(slidesPerView: number): number {
	const perView = clampSlidesPerView(slidesPerView);
	if (perView <= 1) {
		return 0;
	}

	return Math.ceil(perView) - 1;
}

export function resolveCarouselWindow(params: CarouselWindowParams): CarouselWindow {
	const slidesPerView = clampSlidesPerView(params.slidesPerView);
	const slidesPerGroup = clampSlidesPerGroup(params.slidesPerGroup);
	const index = clampIndex(params.index, params.count, slidesPerView);
	const maxStart = maxStartIndex(params.count, slidesPerView);

	return {
		index,
		slidesPerView,
		slidesPerGroup,
		maxStartIndex: maxStart,
		canGoPrev: params.wrap || index > 0,
		canGoNext: params.wrap || index < maxStart,
	};
}

/**
 * Move by `slidesPerGroup`. Overflow wraps to the other end when `wrap` is set;
 * otherwise the window clamps.
 */
export function advanceIndex(params: CarouselWindowParams, deltaGroups: number): number {
	const group = clampSlidesPerGroup(params.slidesPerGroup);
	const proposed = Math.trunc(params.index) + deltaGroups * group;
	const maxStart = maxStartIndex(params.count, params.slidesPerView);

	if (!params.wrap) {
		return clampIndex(proposed, params.count, params.slidesPerView);
	}

	if (maxStart <= 0) {
		return 0;
	}

	if (proposed > maxStart) {
		return 0;
	}

	if (proposed < 0) {
		return maxStart;
	}

	return proposed;
}
