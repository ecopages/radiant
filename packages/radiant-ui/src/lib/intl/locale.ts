export type IntlLocale = string | string[] | undefined;

/** Parses the public comma-separated locale fallback syntax into Intl input. */
export function resolveLocale(locale?: string): IntlLocale {
	if (!locale) {
		return undefined;
	}

	const tags = locale
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean);
	return tags.length > 1 ? tags : tags[0];
}
