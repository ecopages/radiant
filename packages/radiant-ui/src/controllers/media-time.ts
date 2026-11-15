/** The part of `TimeRanges` that `bufferedEnd` reads, so a plain object satisfies it in tests and on the server. */
export type TimeRangesLike = {
	readonly length: number;
	start(index: number): number;
	end(index: number): number;
};

/** Options of `formatMediaTime`. */
export type FormatMediaTimeOptions = {
	/**
	 * `'auto'` (default) shows hours from one hour on, `true` always shows `h:mm:ss`, `false` never does and lets the
	 * minutes pass 59.
	 */
	hours?: 'auto' | boolean;
};

/**
 * Formats a position or duration as `m:ss`, or `h:mm:ss` when hours are shown.
 *
 * @remarks
 * `NaN`, `Infinity` and negative values, which a media element reports before metadata, for a live stream and
 * never respectively, format as zero. Fractions are floored, so a position never reads ahead of the playhead. To
 * keep a position and a duration the same width, pass `hours: duration >= 3600` to both.
 *
 * @example
 * ```ts
 * formatMediaTime(75); // '1:15'
 * formatMediaTime(3725); // '1:02:05'
 * formatMediaTime(75, { hours: true }); // '0:01:15'
 * formatMediaTime(Number.NaN); // '0:00'
 * ```
 */
export function formatMediaTime(seconds: number, options: FormatMediaTimeOptions = {}): string {
	const { hours = 'auto' } = options;
	const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
	const showHours = hours === 'auto' ? total >= 3600 : hours;
	const secs = String(total % 60).padStart(2, '0');
	if (!showHours) {
		return `${Math.floor(total / 60)}:${secs}`;
	}
	const mins = String(Math.floor(total / 60) % 60).padStart(2, '0');
	return `${Math.floor(total / 3600)}:${mins}:${secs}`;
}

/**
 * Clamps a seek target to `[0, duration]`.
 *
 * @remarks
 * A `duration` that is not finite (unknown before metadata, `Infinity` for a live stream) clamps at 0 only. `NaN`
 * and a positive infinity with no finite duration give 0, because `currentTime` throws for a non-finite value.
 *
 * @example
 * ```ts
 * clampSeek(-3, 60); // 0
 * clampSeek(90, 60); // 60
 * clampSeek(90, Number.NaN); // 90
 * ```
 */
export function clampSeek(position: number, duration: number): number {
	const floored = Math.max(0, position);
	if (Number.isFinite(duration)) {
		return Number.isNaN(floored) ? 0 : Math.min(floored, duration);
	}
	return Number.isFinite(floored) ? floored : 0;
}

/**
 * The end, in seconds, of the buffered range that contains `position`, or 0 when none does.
 *
 * @remarks
 * Ranges are inclusive at both ends, so a position exactly at the end of a range still counts as inside it.
 *
 * @example
 * ```ts
 * const ranges = { length: 2, start: (i) => [0, 30][i], end: (i) => [10, 50][i] };
 * bufferedEnd(ranges, 5); // 10
 * bufferedEnd(ranges, 20); // 0
 * ```
 */
export function bufferedEnd(ranges: TimeRangesLike, position: number): number {
	for (let index = 0; index < ranges.length; index++) {
		if (position >= ranges.start(index) && position <= ranges.end(index)) {
			return ranges.end(index);
		}
	}
	return 0;
}
