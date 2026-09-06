import { describe, expect, test } from 'vitest';
import type { ReactiveProperty } from '../../src/core/reactive-prop-core';
import { resolveHostAttributes } from '../../src/server/element-ssr/host-attribute-serialization';

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
});
