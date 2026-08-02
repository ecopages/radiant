export type TextFilterSensitivity = 'base' | 'accent' | 'case';

/**
 * Case- and accent-insensitive "contains" matcher for autocomplete filtering.
 *
 * @remarks `base` ignores case; `case` is a literal substring match.
 */
export function textContains(text: string, query: string, sensitivity: TextFilterSensitivity = 'base'): boolean {
	if (!query) {
		return true;
	}

	if (sensitivity === 'case') {
		return text.includes(query);
	}

	const collator = new Intl.Collator(undefined, {
		sensitivity: sensitivity === 'accent' ? 'accent' : 'base',
		usage: 'search',
	});

	for (let index = 0; index <= text.length - query.length; index += 1) {
		const slice = text.slice(index, index + query.length);
		if (collator.compare(slice, query) === 0) {
			return true;
		}
	}

	return false;
}
