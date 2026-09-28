function isJsonable(value: unknown): boolean {
	if (value === null) {
		return true;
	}

	const type = typeof value;
	if (type === 'string' || type === 'number' || type === 'boolean') {
		return true;
	}

	if (Array.isArray(value)) {
		return value.every(isJsonable);
	}

	if (type === 'object') {
		if (value instanceof Date) {
			return true;
		}
		if (Object.getPrototypeOf(value) !== Object.prototype && !Array.isArray(value)) {
			return false;
		}
		return Object.values(value as Record<string, unknown>).every(isJsonable);
	}

	return false;
}

/** Keep only JSON-serializable story args for the SSR HTTP bridge. */
export function sanitizeSsrArgs(args: Record<string, unknown>): Record<string, unknown> {
	const sanitized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(args)) {
		if (key === 'children' || value === undefined) {
			continue;
		}

		if (isJsonable(value)) {
			sanitized[key] = value;
			continue;
		}

		if (Array.isArray(value)) {
			sanitized[key] = value
				.map((item) => {
					if (!item || typeof item !== 'object' || Array.isArray(item)) {
						return undefined;
					}
					const record = Object.fromEntries(
						Object.entries(item as Record<string, unknown>).filter(([, entry]) => isJsonable(entry)),
					);
					return Object.keys(record).length ? record : undefined;
				})
				.filter(Boolean);
		}
	}

	return sanitized;
}
