/** Parses an ISO `YYYY-MM-DD` string into a local-midnight `Date`, or `null` when invalid. */
export function isoToDate(iso: string | null | undefined): Date | null {
	if (iso == null) {
		return null;
	}
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
	if (!match) {
		return null;
	}

	const year = Number(match[1]);
	const month = Number(match[2]) - 1;
	const day = Number(match[3]);
	const date = new Date(year, month, day);

	if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
		return null;
	}

	return date;
}

/** Serializes a local calendar date to ISO `YYYY-MM-DD`. */
export function dateToIso(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/** Returns true when `iso` falls within optional `min` / `max` bounds (inclusive). */
export function isIsoInRange(iso: string, min?: string, max?: string): boolean {
	if (min && iso < min) {
		return false;
	}
	if (max && iso > max) {
		return false;
	}
	return true;
}
