import { describe, expect, it, vi } from 'vitest';
import { isCssSafeId, uniqueId } from './unique-id';

describe('isCssSafeId', () => {
	it('accepts ids that start with a letter', () => {
		expect(isCssSafeId('plan')).toBe(true);
		expect(isCssSafeId('rui-select')).toBe(true);
		expect(isCssSafeId('Plan_1')).toBe(true);
	});

	it('rejects leading digits, colons, and empty values', () => {
		expect(isCssSafeId('')).toBe(false);
		expect(isCssSafeId('123')).toBe(false);
		expect(isCssSafeId('1plan')).toBe(false);
		expect(isCssSafeId('plan:item')).toBe(false);
		expect(isCssSafeId('plan.item')).toBe(false);
		expect(isCssSafeId('_plan')).toBe(false);
	});
});

describe('uniqueId', () => {
	it('mints distinct CSS-safe ids without the secure-context UUID API', () => {
		vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
		try {
			const first = uniqueId('rui-select');
			expect(first).toMatch(/^rui-select-[0-9a-f]{32}$/);
			expect(uniqueId('rui-select')).not.toBe(first);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('returns a CSS-safe id with a 32-character hex token', () => {
		const id = uniqueId('rui-select');
		expect(isCssSafeId(id)).toBe(true);
		expect(id).toMatch(/^rui-select-[0-9a-f]{32}$/);
	});

	it('mints a unique value on every call', () => {
		expect(uniqueId('rui-dialog')).not.toBe(uniqueId('rui-dialog'));
	});

	it('does not use a sequential integer suffix', () => {
		expect(uniqueId('rui-select')).not.toMatch(/^rui-select-\d+$/);
	});

	it('never starts with a digit even when the prefix would', () => {
		const id = uniqueId('123');
		expect(isCssSafeId(id)).toBe(true);
		expect(id.startsWith('rui-123-')).toBe(true);
	});

	it('falls back to rui when the prefix is empty', () => {
		const id = uniqueId('');
		expect(id.startsWith('rui-')).toBe(true);
		expect(isCssSafeId(id)).toBe(true);
	});
});
