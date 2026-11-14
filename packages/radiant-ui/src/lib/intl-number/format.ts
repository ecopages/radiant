export type NumberFormatOptions = Intl.NumberFormatOptions;
export { resolveLocale } from '../intl/locale';

export function getNumberFormatter(locale?: string | string[], options?: NumberFormatOptions): Intl.NumberFormat {
	return new Intl.NumberFormat(locale, options);
}

export function formatNumber(value: number, locale?: string | string[], options?: NumberFormatOptions): string {
	if (!Number.isFinite(value)) {
		return '';
	}
	return getNumberFormatter(locale, options).format(value);
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

	const formatter = getNumberFormatter(locale, options);
	const parts = [...formatter.formatToParts(-1234.5), ...formatter.formatToParts(1)];
	const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.';
	const group = parts.find((part) => part.type === 'group')?.value;
	const minusSign = parts.find((part) => part.type === 'minusSign')?.value ?? '-';
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
