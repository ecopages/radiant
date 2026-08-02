import { dateToIso, isIsoInRange } from './iso';
import {
	getDaySelectionAppearance,
	parseIsoRange,
	parseMultipleIsos,
	type CalendarSelectionMode,
	type IsoRange,
} from './selection';
import type { CalendarWeek, IntlLocale } from './types';

export type { CalendarSelectionMode, IsoRange };

/**
 * Returns the JS weekday index (0 = Sunday) that starts the week for `locale`.
 *
 * @remarks Uses `Intl.Locale.weekInfo` when available; falls back to Monday except en-US.
 */
export function getWeekStartsOn(locale: IntlLocale): number {
	const tag = resolveLocaleTag(locale);

	try {
		const resolved = new Intl.Locale(tag);
		const weekInfo = (resolved as Intl.Locale & { weekInfo?: { firstDay: number } }).weekInfo;
		if (weekInfo?.firstDay != null) {
			return weekInfo.firstDay === 7 ? 0 : weekInfo.firstDay;
		}
	} catch {
		// Intl.Locale unsupported or invalid tag — use fallback below.
	}

	return tag.startsWith('en-US') ? 0 : 1;
}

function resolveLocaleTag(locale: IntlLocale): string {
	if (Array.isArray(locale)) {
		return locale[0] ?? navigator.language;
	}
	return locale ?? navigator.language;
}

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export type BuildCalendarMonthOptions = {
	locale: IntlLocale;
	selectionMode?: CalendarSelectionMode;
	/** Single mode: selected ISO. Multiple: comma-separated. Range: `start/end`. */
	value?: string;
	/** Active range while selecting (anchor + hover preview). */
	rangeDraft?: { anchor: string | null; hover: string | null };
	min?: string;
	max?: string;
	today?: Date;
};

function resolveSelectionContext(options: BuildCalendarMonthOptions): {
	mode: CalendarSelectionMode;
	singleIso?: string;
	multipleIsos?: string[];
	range?: IsoRange | null;
} {
	const mode = options.selectionMode ?? 'single';
	const value = options.value ?? '';

	if (mode === 'multiple') {
		return { mode, multipleIsos: parseMultipleIsos(value) };
	}

	if (mode === 'range') {
		const committed = parseIsoRange(value);
		if (options.rangeDraft?.anchor) {
			const hover = options.rangeDraft.hover ?? options.rangeDraft.anchor;
			return {
				mode,
				range: normalizeRangeFromDraft(options.rangeDraft.anchor, hover),
			};
		}
		return { mode, range: committed };
	}

	return { mode, singleIso: value || undefined };
}

function normalizeRangeFromDraft(anchor: string, hover: string): IsoRange {
	if (anchor.localeCompare(hover) <= 0) {
		return { start: anchor, end: hover };
	}
	return { start: hover, end: anchor };
}

/** Builds a month grid with leading/trailing days from adjacent months. */
export function buildCalendarMonth(year: number, month: number, options: BuildCalendarMonthOptions): CalendarWeek[] {
	const weekStartsOn = getWeekStartsOn(options.locale);
	const today = startOfDay(options.today ?? new Date());
	const selection = resolveSelectionContext(options);
	const firstOfMonth = new Date(year, month, 1);
	const startOffset = (firstOfMonth.getDay() - weekStartsOn + 7) % 7;
	const gridStart = new Date(year, month, 1 - startOffset);

	const weeks: CalendarWeek[] = [];
	const cursor = new Date(gridStart);

	for (let week = 0; week < 6; week += 1) {
		const row: CalendarWeek[number][] = [];

		for (let day = 0; day < 7; day += 1) {
			const iso = dateToIso(cursor);
			const appearance = getDaySelectionAppearance(iso, selection.mode, {
				singleIso: selection.singleIso,
				multipleIsos: selection.multipleIsos,
				range: selection.range,
			});

			row.push({
				date: new Date(cursor),
				iso,
				inMonth: cursor.getMonth() === month,
				isToday: isSameDay(cursor, today),
				isSelected: appearance.isSelected,
				isDisabled: !isIsoInRange(iso, options.min, options.max),
				isRangeStart: appearance.isRangeStart,
				isRangeEnd: appearance.isRangeEnd,
				isRangeMiddle: appearance.isRangeMiddle,
			});
			cursor.setDate(cursor.getDate() + 1);
		}

		weeks.push(row);

		if (week >= 4 && cursor.getMonth() !== month && cursor.getDate() > 7) {
			break;
		}
	}

	return weeks;
}
