/** An inclusive frequency range in Hz. */
export type FrequencyBand = readonly [low: number, high: number];

/**
 * Splits `[min, max]` Hz into `count` log-spaced bands, which is how pitch is heard: each band spans the same
 * ratio, so the low end is not a single bar and the top is not most of them.
 *
 * @example
 * ```ts
 * logBands(2, 100, 10000); // [[100, 1000], [1000, 10000]]
 * ```
 */
export function logBands(count: number, min = 60, max = 8000): FrequencyBand[] {
	const ratio = (max / min) ** (1 / count);
	return Array.from({ length: count }, (_, index) => [min * ratio ** index, min * ratio ** (index + 1)]);
}

/**
 * The loudest bin of `frequency` between `low` and `high` Hz, as 0 to 1.
 *
 * @remarks
 * A band narrower than one bin still reads that bin, and a band above the last bin (a low sample rate has a low
 * Nyquist frequency) reads the last, so a band is never empty.
 */
export function bandPeak(
	frequency: Uint8Array,
	sampleRate: number,
	fftSize: number,
	[low, high]: FrequencyBand,
): number {
	const hertzPerBin = sampleRate / fftSize;
	const start = Math.min(Math.floor(low / hertzPerBin), frequency.length - 1);
	const end = Math.min(Math.max(Math.ceil(high / hertzPerBin), start + 1), frequency.length);
	let peak = 0;
	for (let bin = start; bin < end; bin++) {
		peak = Math.max(peak, frequency[bin]);
	}
	return peak / 255;
}

/** How a band's raw level (0 to 1) becomes a bar level: a noise floor, the span above it, and a curve. */
export type LevelShape = {
	/** The raw level at or below which a band is off. */
	floorLevel: number;
	/** The raw span above `floorLevel` that fills the bar. */
	range: number;
	/** The exponent applied to the scaled level; above 1 spreads quiet and loud bands apart. */
	curve: number;
};

/** The running maximum of the band levels that `stepGain` keeps, as 0 to 1. */
export type Gain = { top: number };

/** The narrowest span a running maximum may scale to, so noise is not stretched to a full bar. */
export const MIN_ADAPTIVE_RANGE = 0.15;

/**
 * Raises the running maximum to `loudest` at once, and lets it fall by `decay` full scales per second otherwise.
 * It writes into `gain` so a frame allocates nothing.
 */
export function stepGain(gain: Gain, loudest: number, elapsed: number, decay: number): void {
	gain.top = Math.max(loudest, gain.top - (decay * elapsed) / 1000);
}

/**
 * A band's raw `level` (0 to 1) as a bar level (0 to 1): nothing at or below `floorLevel`, the full bar at
 * `floorLevel + range`, shaped by `curve` in between.
 *
 * @remarks
 * With `top` (a running maximum from `stepGain`) the full bar is at `top` instead, but never closer than
 * `MIN_ADAPTIVE_RANGE` above `floorLevel`, so a quiet track still uses the full height and silence stays empty.
 */
export function shapeLevel(level: number, { floorLevel, range, curve }: LevelShape, top?: number): number {
	const span = top === undefined ? range : Math.max(MIN_ADAPTIVE_RANGE, top - floorLevel);
	return Math.min(1, Math.max(0, (level - floorLevel) / span)) ** curve;
}

/** A bar's peak cap: the level it holds and the time it last was at least that high. */
export type Peak = { value: number; heldSince: number };

/** How long a peak cap holds, in milliseconds, and how fast it then falls, in full bar heights per second. */
export type PeakTiming = { hold: number; fall: number };

/**
 * Moves a bar's peak cap for a frame at time `now`, `elapsed` milliseconds after the previous one.
 *
 * @remarks
 * A level at or above the cap raises it and restarts the hold. Below it the cap stays for `hold` milliseconds and
 * then falls by `fall` bar heights per second, never under the level. It writes into `peak` so a frame allocates
 * nothing.
 */
export function stepPeak(peak: Peak, level: number, now: number, elapsed: number, { hold, fall }: PeakTiming): void {
	if (level >= peak.value) {
		peak.value = level;
		peak.heldSince = now;
	} else if (now - peak.heldSince > hold) {
		peak.value = Math.max(level, peak.value - (fall * elapsed) / 1000);
	}
}

/** How many of `segments` LED segments a bar of `level` (0 to 1) lights, counted from the bottom. */
export function litSegments(level: number, segments: number): number {
	return Math.min(segments, Math.max(0, Math.ceil(level * segments)));
}

/**
 * The vertical extent of the segment at `index`, counted from the bottom, in a bar `height` tall that starts at
 * `top`, with `gap` between segments.
 */
export function segmentBounds(
	index: number,
	segments: number,
	gap: number,
	top: number,
	height: number,
): { y: number; height: number } {
	const size = (height - gap * (segments - 1)) / segments;
	return { y: top + height - (index + 1) * size - index * gap, height: size };
}

/** The continuous bar shapes: a bar from the bottom, a thin one, or one that grows both ways from the middle. */
export type BarShape = 'solid' | 'line' | 'mirror';

/** A rectangle in CSS pixels; `barBounds` writes into one so a frame allocates nothing. */
export type Rect = { x: number; y: number; width: number; height: number };

/**
 * The rectangle of a continuous bar of `level` (0 to 1) in the slot that starts at `x` and is `slotWidth` wide,
 * inside the area that starts at `top` and is `height` tall; written into `out`.
 *
 * @remarks
 * A `solid` bar fills the slot and rises from the bottom, a `line` bar is at most `lineWidth` wide and centered in
 * the slot, and a `mirror` bar fills the slot and is centered vertically, so it is `level * height` tall in total.
 * A level of 0 has no height, so there is no minimum bar.
 */
export function barBounds(
	out: Rect,
	shape: BarShape,
	level: number,
	x: number,
	slotWidth: number,
	lineWidth: number,
	top: number,
	height: number,
): Rect {
	const width = shape === 'line' ? Math.min(slotWidth, lineWidth) : slotWidth;
	const barHeight = level * height;
	out.x = x + (slotWidth - width) / 2;
	out.width = width;
	out.height = barHeight;
	out.y = shape === 'mirror' ? top + (height - barHeight) / 2 : top + height - barHeight;
	return out;
}
