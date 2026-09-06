import { describe, expect, test } from 'vitest';
import {
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
});
