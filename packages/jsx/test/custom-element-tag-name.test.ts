import { describe, expect, test } from 'vitest';
import { CUSTOM_ELEMENT_TAG_NAME, getCustomElementTagName } from '../src/jsx-runtime.ts';

describe('custom-element tag-name metadata', () => {
	test('reads the tag name associated with a constructor', () => {
		const Constructor = class {} as unknown as CustomElementConstructor;
		Reflect.set(Constructor, CUSTOM_ELEMENT_TAG_NAME, 'radiant-shared-tag');

		expect(getCustomElementTagName(Constructor)).toBe('radiant-shared-tag');
		expect(getCustomElementTagName(class {} as unknown as CustomElementConstructor)).toBeUndefined();
	});
});
