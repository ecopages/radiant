/**
 * The options of `Intl.NumberFormat`.
 */
export type NumberFormatOptions = Intl.NumberFormatOptions;
export { resolveLocale } from '../intl/locale';

/**
 * Creates an `Intl.NumberFormat`.
 */
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
 * Parses a locale-aware number string. Returns `null` when the input is empty or invalid.
 *
 * @example
 * ```ts
 * parseNumber('1.234,5', 'de-DE'); // 1234.5
 * ```
 */
export function parseNumber(input: string, locale?: string | string[], options?: NumberFormatOptions): number | null {
	const trimmed = input.trim();
	if (!trimmed) {
		return null;
	}

	const formatter = getNumberFormatter(locale, options);
	const parts = formatter.formatToParts(1234.5);
	const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.';
	const group = parts.find((part) => part.type === 'group')?.value ?? ',';

	const normalized = trimmed
		.replaceAll(group, '')
		.replace(decimal, '.')
		.replace(/[^\d.-]/g, '');
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
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
