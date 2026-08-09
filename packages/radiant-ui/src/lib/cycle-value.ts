/**
 * Returns the next value in a cyclic list, wrapping from the last item to the first.
 *
 * @remarks
 * When `current` is missing or not found in `values`, returns the first entry so
 * callers can recover from stale or unset state.
 */
export function cycleValue<T extends string>(values: readonly T[], current: T | undefined): T {
	if (values.length === 0) {
		throw new RangeError('cycleValue requires at least one value');
	}

	const index = current === undefined ? -1 : values.indexOf(current);
	if (index === -1) {
		return values[0];
	}

	return values[(index + 1) % values.length];
}
