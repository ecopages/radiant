import { isServer } from '@ecopages/radiant/is-server';
import { describe, expect, test } from 'vitest';

describe('isServer (node)', () => {
	test('resolves to true under the node export condition', () => {
		expect(isServer).toBe(true);
	});
});
