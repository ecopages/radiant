import { isServer } from '@ecopages/radiant/is-server';
import { describe, expect, test } from 'vitest';

describe('isServer (browser)', () => {
	test('resolves to false in browser environments', () => {
		expect(isServer).toBe(false);
	});
});
