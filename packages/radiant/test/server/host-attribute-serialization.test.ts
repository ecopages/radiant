import { describe, expect, test } from 'vitest';
import type { ReactiveProperty } from '../../src/core/reactive-prop-core';
import {
	resolveHostAttributes,
	stringifyHostAttributes,
} from '../../src/server/element-ssr/host-attribute-serialization';

describe('resolveHostAttributes', () => {
	test('omits attributes when a custom toAttribute returns null', () => {
		const property: ReactiveProperty<string[]> = {
			type: Array,
			name: 'value',
			attribute: 'value',
			reflect: true,
			converter: {
				fromAttribute: () => [],
				toAttribute: () => null,
			},
		};

		const attributes = resolveHostAttributes({
			getReactiveProperties: () => [property],
			getReactivePropDefinitions: () => [],
			getPropertyValue: () => [],
			getAttributeNames: () => [],
			getAttribute: () => null,
		});

		expect(attributes).toEqual({});
	});

	test('omits false-default boolean false and emits true-default boolean false', () => {
		const presence: ReactiveProperty<boolean> = {
			type: Boolean,
			name: 'disabled',
			attribute: 'disabled',
			reflect: true,
			defaultValue: false,
			converter: {
				fromAttribute: (value) => value !== null,
				toAttribute: (value) => (value ? 'true' : 'false'),
			},
		};
		const valueBoolean: ReactiveProperty<boolean> = {
			type: Boolean,
			name: 'enabled',
			attribute: 'enabled',
			reflect: true,
			defaultValue: true,
			converter: {
				fromAttribute: (value) => value !== 'false',
				toAttribute: (value) => (value ? 'true' : 'false'),
			},
		};

		const attributes = resolveHostAttributes({
			getReactiveProperties: () => [presence, valueBoolean],
			getReactivePropDefinitions: () => [],
			getPropertyValue: () => false,
			getAttributeNames: () => [],
			getAttribute: () => null,
		});

		expect(attributes).toEqual({ enabled: 'false' });
	});

	test('serializes camelCase prop definitions with kebab-case attribute names', () => {
		const attributes = resolveHostAttributes({
			getReactiveProperties: () => [],
			getReactivePropDefinitions: () => [
				{ name: 'minWidth', options: { type: Number } },
				{ name: 'isOpen', options: { type: Boolean, attribute: 'data-Open' } },
			],
			getPropertyValue: (name) => (name === 'minWidth' ? 300 : true),
			getAttributeNames: () => [],
			getAttribute: () => null,
		});

		expect(attributes).toEqual({ 'min-width': '300', 'data-Open': 'true' });
		expect(stringifyHostAttributes(attributes)).toBe(' min-width="300" data-Open="true"');
	});
});
