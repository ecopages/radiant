export type CalendarSelectionMode = 'single' | 'multiple' | 'range';

export type IsoRange = {
	start: string;
	end: string;
};

export type RangeSelectionDraft = {
	anchor: string | null;
	hover: string | null;
};

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

export function normalizeRange(start: string, end: string): IsoRange {
	if (compareIso(start, end) <= 0) {
		return { start, end };
	}
	return { start: end, end: start };
}

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

export function serializeIsoRange(range: IsoRange | null): string {
	if (!range) {
		return '';
	}
	const normalized = normalizeRange(range.start, range.end);
	return `${normalized.start}${RANGE_SEPARATOR}${normalized.end}`;
}

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

export function serializeMultipleIsos(values: Iterable<string>): string {
	return [...new Set(values)].sort(compareIso).join(MULTIPLE_SEPARATOR);
}

export function toggleMultipleIso(selected: readonly string[], iso: string): string[] {
	const set = new Set(selected);
	if (set.has(iso)) {
		set.delete(iso);
	} else {
		set.add(iso);
	}
	return [...set].sort(compareIso);
}

export function isIsoInSpan(iso: string, range: IsoRange): boolean {
	const normalized = normalizeRange(range.start, range.end);
	return compareIso(iso, normalized.start) >= 0 && compareIso(iso, normalized.end) <= 0;
}

export function getActiveRangeBounds(
	committed: IsoRange | null,
	draft: RangeSelectionDraft,
): IsoRange | null {
	if (draft.anchor) {
		const hover = draft.hover ?? draft.anchor;
		return normalizeRange(draft.anchor, hover);
	}
	return committed;
}

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
