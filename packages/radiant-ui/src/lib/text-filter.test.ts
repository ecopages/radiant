import { describe, expect, it } from 'vitest';
import { textContains } from './text-filter';

describe('textContains', () => {
	it('matches case-insensitively by default', () => {
		expect(textContains('California', 'forn')).toBe(true);
		expect(textContains('California', 'FORN')).toBe(true);
	});

	it('returns true for empty query', () => {
		expect(textContains('California', '')).toBe(true);
	});

	it('supports case-sensitive mode', () => {
		expect(textContains('California', 'forn', 'case')).toBe(true);
		expect(textContains('California', 'FORN', 'case')).toBe(false);
	});
});
