export type NumberFormatOptions = Intl.NumberFormatOptions;
export { resolveLocale } from '../intl/locale';

export function getNumberFormatter(locale?: string | string[], options?: NumberFormatOptions): Intl.NumberFormat {
	return new Intl.NumberFormat(locale, options);
}

/**
 * Formats a number for a locale; `''` for a value that is not finite.
 *
 * @example
 * ```ts
 * formatNumber(1234.5, 'de-DE'); // '1.234,5'
 * ```
 */
export function formatNumber(value: number, locale?: string | string[], options?: NumberFormatOptions): string {
	if (!Number.isFinite(value)) {
		return '';
	}
	return getNumberFormatter(locale, options).format(value);
}

/**
 * The separators and signs a locale and format options write around a number, read from the formatter itself.
 *
 * @remarks
 * `formatEditableNumber` and `parseNumber` both read the decimal separator here, so they always agree. Options such
 * as `maximumSignificantDigits: 3` round the probe numbers to integers and leave no decimal separator to find; the
 * plain formatter of the locale gives it then, because a `.` there would be read back as a group separator in a
 * locale that groups with a dot.
 */
function readNumberSymbols(locale?: string | string[], options?: NumberFormatOptions) {
	const formatter = getNumberFormatter(locale, options);
	const parts = [...formatter.formatToParts(-1234.5), ...formatter.formatToParts(1)];
	const decimal =
		parts.find((part) => part.type === 'decimal')?.value ??
		getNumberFormatter(locale)
			.formatToParts(1.5)
			.find((part) => part.type === 'decimal')?.value ??
		'.';
	return {
		parts,
		decimal,
		group: parts.find((part) => part.type === 'group')?.value,
		minusSign: parts.find((part) => part.type === 'minusSign')?.value ?? '-',
	};
}

/**
 * Writes a number as text to edit: its digits without grouping and with the decimal separator of the locale, which
 * `parseNumber` reads back to the same number. `''` for a value that is not finite.
 *
 * @remarks
 * `String(value)` is not read back in a locale that groups with a dot: `parseNumber('1234.5', 'de-DE')` drops the
 * dot as a group separator and returns 12345. The digits stay ASCII, as `parseNumber` expects, and only the decimal
 * separator is the locale's, taken from the same formatter `parseNumber` uses.
 *
 * @example
 * ```ts
 * formatEditableNumber(1234.5, 'de-DE'); // '1234,5'
 * ```
 */
export function formatEditableNumber(value: number, locale?: string | string[], options?: NumberFormatOptions): string {
	if (!Number.isFinite(value)) {
		return '';
	}
	return String(value).replace('.', readNumberSymbols(locale, options).decimal);
}

/**
 * Parses a locale-aware number string. Returns `null` when the input is empty or is not a number.
 *
 * @remarks
 * Only what the formatter itself writes around a number is ignored: the group separator, the currency
 * symbol or name, the percent sign, the unit and spaces. Any other text makes the input invalid, as in a
 * native number input, so a caller can keep its committed value when the result is `null`.
 *
 * @example
 * ```ts
 * parseNumber('1.234,5', 'de-DE'); // 1234.5
 * parseNumber('$1,234.50', 'en-US', { style: 'currency', currency: 'USD' }); // 1234.5
 * parseNumber('12abc', 'en-US'); // null
 * ```
 */
export function parseNumber(input: string, locale?: string | string[], options?: NumberFormatOptions): number | null {
	const trimmed = input.trim();
	if (!trimmed) {
		return null;
	}

	const { parts, decimal, group, minusSign } = readNumberSymbols(locale, options);
	const symbols = new Set(
		parts
			.filter((part) => ['currency', 'percentSign', 'unit', 'literal'].includes(part.type))
			.map((part) => part.value),
	);

	let normalized = trimmed;
	for (const symbol of [...symbols].sort((a, b) => b.length - a.length)) {
		normalized = normalized.replaceAll(symbol, '');
	}
	if (group) {
		normalized = normalized.replaceAll(group, '');
	}
	normalized = normalized.replaceAll(minusSign, '-').trim();
	if (decimal !== '.') {
		if (normalized.includes('.')) {
			return null;
		}
		normalized = normalized.replace(decimal, '.');
	}
	return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(normalized) ? Number(normalized) : null;
}

/**
 * Reads `Intl.NumberFormat` options from a JSON string, or `undefined` when it is empty, not an object or not valid options.
 *
 * @example
 * ```ts
 * parseFormatOptions('{"style":"percent"}'); // { style: 'percent' }
 * ```
 */
export function parseFormatOptions(raw?: string): NumberFormatOptions | undefined {
	if (!raw) {
		return undefined;
	}
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!isObjectRecord(parsed)) {
			return undefined;
		}
		new Intl.NumberFormat(undefined, parsed as NumberFormatOptions);
		return parsed as NumberFormatOptions;
	} catch {
		return undefined;
	}
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
