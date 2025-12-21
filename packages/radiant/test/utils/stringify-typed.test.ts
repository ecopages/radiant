import { describe, expect, test } from 'vitest';
import { stringifyTyped } from '../../src/tools/stringify-typed';

describe('stringifyTyped', () => {
	test('it stringifies a boolean', () => {
		expect(stringifyTyped(true)).toBe('true');
		expect(stringifyTyped(false)).toBe('false');
	});

	test('it stringifies a number', () => {
		expect(stringifyTyped(1)).toBe('1');
		expect(stringifyTyped(1_000)).toBe('1000');
		expect(stringifyTyped(1_000_000)).toBe('1000000');
	});

	test('it stringifies an object', () => {
		expect(stringifyTyped({ hello: 'world' })).toBe('{"hello":"world"}');
		expect(stringifyTyped({})).toBe('{}');
	});

	test('it stringifies an array', () => {
		expect(stringifyTyped(['hello', 'world'])).toBe('["hello","world"]');
		expect(stringifyTyped([])).toBe('[]');
	});

	test('it stringifies a null value', () => {
		expect(stringifyTyped(null)).toBe('null');
	});

	test('it stringifies an undefined value', () => {
		expect(stringifyTyped(undefined)).toBe(undefined);
	});

	test('it stringifies a symbol', () => {
		expect(stringifyTyped(Symbol('hello'))).toBe(undefined);
	});
});
