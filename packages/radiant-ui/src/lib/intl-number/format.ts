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
 * Parses a locale-aware number string. Returns `null` when the input is empty or invalid.
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
