export function snapToStep(value: number, min: number, max: number, step: number): number {
	const stepped = Math.round((value - min) / step) * step + min;
	return Math.min(max, Math.max(min, stepped));
}

export function isWithinRange(value: number, min: number, max: number): boolean {
	return value >= min && value <= max;
}

export function isOnStep(value: number, min: number, step: number): boolean {
	return Math.abs((value - min) % step) < Number.EPSILON || Math.abs(((value - min) % step) - step) < Number.EPSILON;
}
