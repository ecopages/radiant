import { describe, expect, test } from 'vitest';
import {
	applyObservedAttributesFromPropRegistry,
	attributeNameForProp,
	getReactivePropDefinitions,
	registerReactivePropDefinition,
} from '../../src/core/reactive-prop-metadata';

describe('reactive prop metadata registry', () => {
	test('does not leak subclass definitions into a related sibling or the base class', () => {
		class BaseHost {}
		class ChildHost extends BaseHost {}
		class SiblingHost extends BaseHost {}

		registerReactivePropDefinition(BaseHost, 'base', { type: String });
		registerReactivePropDefinition(ChildHost, 'child', { type: String });
		registerReactivePropDefinition(SiblingHost, 'sibling', { type: Boolean });

		expect(getReactivePropDefinitions(BaseHost).map((definition) => definition.name)).toEqual(['base']);
		expect(getReactivePropDefinitions(ChildHost).map((definition) => definition.name)).toEqual(['base', 'child']);
		expect(getReactivePropDefinitions(SiblingHost).map((definition) => definition.name)).toEqual([
			'base',
			'sibling',
		]);
	});

	test('maps camelCase property names to kebab-case attributes unless explicitly overridden', () => {
		expect(attributeNameForProp('minWidth', { type: Number })).toBe('min-width');
		expect(attributeNameForProp('isOpen', { type: Boolean, attribute: 'data-Open' })).toBe('data-Open');
	});

	test('uses the mapped name when preparing observedAttributes from prop metadata', () => {
		class Host {}
		const constructor = Host as unknown as CustomElementConstructor;

		registerReactivePropDefinition(constructor, 'minWidth', { type: Number });
		registerReactivePropDefinition(constructor, 'isOpen', { type: Boolean, attribute: 'data-Open' });
		applyObservedAttributesFromPropRegistry(constructor);

		expect(Reflect.get(constructor, 'observedAttributes')).toContain('min-width');
		expect(Reflect.get(constructor, 'observedAttributes')).toContain('data-Open');
	});
});
