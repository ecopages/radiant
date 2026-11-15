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
