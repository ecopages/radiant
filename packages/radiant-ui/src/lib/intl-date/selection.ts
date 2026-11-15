/**
 * How a calendar selects: one day, several days or a range.
 */
export type CalendarSelectionMode = 'single' | 'multiple' | 'range';

/**
 * A date range as two ISO dates, `start` not after `end`.
 */
export type IsoRange = {
	start: string;
	end: string;
};

/**
 * A range being picked: the first click is the `anchor`, the pointer position is the `hover`.
 */
export type RangeSelectionDraft = {
	anchor: string | null;
	hover: string | null;
};

/**
 * How one day is drawn for the current selection.
 */
export type DaySelectionAppearance = {
	isSelected: boolean;
	isRangeStart: boolean;
	isRangeEnd: boolean;
	isRangeMiddle: boolean;
};

const RANGE_SEPARATOR = '/';
const MULTIPLE_SEPARATOR = ',';

/** Lexicographic compare for ISO `YYYY-MM-DD` strings. */
export function compareIso(a: string, b: string): number {
	return a.localeCompare(b);
}

/**
 * Orders two ISO dates into an `IsoRange`.
 *
 * @example
 * ```ts
 * normalizeRange('2026-11-20', '2026-11-14'); // { start: '2026-11-14', end: '2026-11-20' }
 * ```
 */
export function normalizeRange(start: string, end: string): IsoRange {
	if (compareIso(start, end) <= 0) {
		return { start, end };
	}
	return { start: end, end: start };
}

/**
 * Reads the `start/end` form into an `IsoRange`, or `null` when either end is missing.
 *
 * @example
 * ```ts
 * parseIsoRange('2026-11-20/2026-11-14'); // { start: '2026-11-14', end: '2026-11-20' }
 * ```
 */
export function parseIsoRange(value: string | null | undefined): IsoRange | null {
	if (!value) {
		return null;
	}
	const [start, end] = value.split(RANGE_SEPARATOR);
	if (!start || !end) {
		return null;
	}
	return normalizeRange(start, end);
}

/**
 * Writes an `IsoRange` as `start/end`, or `''` for `null`.
 *
 * @example
 * ```ts
 * serializeIsoRange({ start: '2026-11-14', end: '2026-11-20' }); // '2026-11-14/2026-11-20'
 * ```
 */
export function serializeIsoRange(range: IsoRange | null): string {
	if (!range) {
		return '';
	}
	const normalized = normalizeRange(range.start, range.end);
	return `${normalized.start}${RANGE_SEPARATOR}${normalized.end}`;
}

/**
 * Reads a comma-separated list of ISO dates, sorted.
 *
 * @example
 * ```ts
 * parseMultipleIsos('2026-11-20, 2026-11-14'); // ['2026-11-14', '2026-11-20']
 * ```
 */
export function parseMultipleIsos(value: string | null | undefined): string[] {
	if (!value) {
		return [];
	}
	return value
		.split(MULTIPLE_SEPARATOR)
		.map((iso) => iso.trim())
		.filter(Boolean)
		.sort(compareIso);
}

/**
 * Writes ISO dates as a sorted, comma-separated list without duplicates.
 */
export function serializeMultipleIsos(values: Iterable<string>): string {
	return [...new Set(values)].sort(compareIso).join(MULTIPLE_SEPARATOR);
}

/**
 * Adds `iso` to a selection, or removes it when it is there. The result is sorted.
 *
 * @example
 * ```ts
 * toggleMultipleIso(['2026-11-14'], '2026-11-20'); // ['2026-11-14', '2026-11-20']
 * ```
 */
export function toggleMultipleIso(selected: readonly string[], iso: string): string[] {
	const set = new Set(selected);
	if (set.has(iso)) {
		set.delete(iso);
	} else {
		set.add(iso);
	}
	return [...set].sort(compareIso);
}

/**
 * Whether `iso` lies in the range, ends included.
 */
export function isIsoInSpan(iso: string, range: IsoRange): boolean {
	const normalized = normalizeRange(range.start, range.end);
	return compareIso(iso, normalized.start) >= 0 && compareIso(iso, normalized.end) <= 0;
}

/**
 * The range to draw: the draft while one is open, else the committed range.
 */
export function getActiveRangeBounds(committed: IsoRange | null, draft: RangeSelectionDraft): IsoRange | null {
	if (draft.anchor) {
		const hover = draft.hover ?? draft.anchor;
		return normalizeRange(draft.anchor, hover);
	}
	return committed;
}

/**
 * How one day is drawn in the given selection mode.
 *
 * @example
 * ```ts
 * getDaySelectionAppearance('2026-11-15', 'range', { range: { start: '2026-11-14', end: '2026-11-16' } });
 * // { isSelected: true, isRangeStart: false, isRangeEnd: false, isRangeMiddle: true }
 * ```
 */
export function getDaySelectionAppearance(
	iso: string,
	mode: CalendarSelectionMode,
	options: {
		singleIso?: string;
		multipleIsos?: readonly string[];
		range?: IsoRange | null;
	},
): DaySelectionAppearance {
	if (mode === 'single') {
		const selected = options.singleIso === iso;
		return {
			isSelected: selected,
			isRangeStart: selected,
			isRangeEnd: selected,
			isRangeMiddle: false,
		};
	}

	if (mode === 'multiple') {
		const selected = options.multipleIsos?.includes(iso) ?? false;
		return {
			isSelected: selected,
			isRangeStart: selected,
			isRangeEnd: selected,
			isRangeMiddle: false,
		};
	}

	const range = options.range;
	if (!range) {
		return { isSelected: false, isRangeStart: false, isRangeEnd: false, isRangeMiddle: false };
	}

	const normalized = normalizeRange(range.start, range.end);
	const inSpan = isIsoInSpan(iso, normalized);
	const isStart = iso === normalized.start;
	const isEnd = iso === normalized.end;
	const isMiddle = inSpan && !isStart && !isEnd;

	return {
		isSelected: inSpan,
		isRangeStart: isStart,
		isRangeEnd: isEnd,
		isRangeMiddle: isMiddle,
	};
}

/**
 * Advances range selection after a day click.
 *
 * First click sets the anchor; second click commits the range.
 *
 * @example
 * ```ts
 * advanceRangeSelection(null, { anchor: null, hover: null }, '2026-11-14');
 * // { committed: null, draft: { anchor: '2026-11-14', hover: '2026-11-14' } }
 * ```
 */
export function advanceRangeSelection(
	committed: IsoRange | null,
	draft: RangeSelectionDraft,
	iso: string,
): { committed: IsoRange | null; draft: RangeSelectionDraft } {
	if (!draft.anchor) {
		return { committed, draft: { anchor: iso, hover: iso } };
	}

	const next = normalizeRange(draft.anchor, iso);
	return { committed: next, draft: { anchor: null, hover: null } };
}
