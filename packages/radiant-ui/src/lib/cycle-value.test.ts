import { describe, expect, it } from 'vitest';
import { cycleValue } from './cycle-value';

describe('cycleValue', () => {
	const values = ['system', 'light', 'dark'] as const;

	it('wraps from the last value to the first', () => {
		expect(cycleValue(values, 'dark')).toBe('system');
	});

	it('advances to the next value in order', () => {
		expect(cycleValue(values, 'system')).toBe('light');
		expect(cycleValue(values, 'light')).toBe('dark');
	});

	it('returns the first value when current is missing or unknown', () => {
		expect(cycleValue(values, undefined)).toBe('system');
		expect(cycleValue(values, 'unknown')).toBe('system');
	});

	it('throws when values is empty', () => {
		expect(() => cycleValue([], 'light')).toThrow(RangeError);
	});
});
