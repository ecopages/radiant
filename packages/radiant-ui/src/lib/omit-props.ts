/**
 * Drops keys so they are not forwarded onto a host.
 */
export function omitProps<T extends object, K extends keyof T>(props: T, ...keys: K[]): Omit<T, K> {
	const next = { ...props };
	for (const key of keys) {
		delete next[key];
	}
	return next;
}
