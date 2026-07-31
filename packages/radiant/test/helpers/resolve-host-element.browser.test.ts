import { describe, expect, test } from 'vitest';
import { isControllerHost, resolveHostElement, resolveHostElementOrNull } from '../../src/helpers/resolve-host-element';

describe('resolveHostElement', () => {
	test('resolves a DOM element', () => {
		const element = document.createElement('div');
		expect(resolveHostElement(element)).toBe(element);
		expect(resolveHostElementOrNull(element)).toBe(element);
		expect(isControllerHost(element)).toBe(false);
	});

	test('resolves controller host wrappers with own properties', () => {
		const host = document.createElement('section');
		const controller = { host };
		expect(resolveHostElement(controller)).toBe(host);
		expect(isControllerHost(controller)).toBe(true);
	});

	test('resolves legacy element aliases with own properties', () => {
		const element = document.createElement('button');
		const controller = { element };
		expect(resolveHostElement(controller)).toBe(element);
		expect(isControllerHost(controller)).toBe(true);
	});

	test('rejects null and primitives', () => {
		expect(() => resolveHostElement(null)).toThrow(TypeError);
		expect(() => resolveHostElement('div')).toThrow(TypeError);
		expect(resolveHostElementOrNull(null)).toBeNull();
		expect(resolveHostElementOrNull(undefined)).toBeNull();
	});

	test('ignores inherited host properties', () => {
		const host = document.createElement('div');
		const inherited = Object.create({ host });
		expect(isControllerHost(inherited)).toBe(false);
		expect(() => resolveHostElement(inherited)).toThrow(TypeError);
		expect(resolveHostElementOrNull(inherited)).toBeNull();
	});

	test('rejects wrappers without element values', () => {
		const controller = { host: null };
		expect(isControllerHost(controller)).toBe(false);
		expect(() => resolveHostElement(controller)).toThrow(TypeError);
	});
});
