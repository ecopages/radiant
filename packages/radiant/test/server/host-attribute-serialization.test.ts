import { afterEach, describe, expect, test, vi } from 'vitest';
import { createPropConverter, type ReactiveProperty } from '../../src/core/reactive-prop-core';
import {
	resolveHostAttributes,
	stringifyHostAttributes,
} from '../../src/server/element-ssr/host-attribute-serialization';

let uniqueCounter = 0;

/** A name no other test uses, because warnings dedupe on a module-level key that outlives each test. */
function uniqueAttribute(prefix: string): string {
	return `${prefix}-${++uniqueCounter}`;
}

describe('resolveHostAttributes', () => {
	afterEach(() => vi.restoreAllMocks());

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

	test('omits a function-valued reactive property and warns once without writing its source', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const handler = () => 'secret source';
		const attribute = uniqueAttribute('via-property');
		const property: ReactiveProperty<unknown> = {
			type: String,
			name: 'viaProperty',
			attribute,
			reflect: true,
			converter: createPropConverter(String, undefined, attribute),
		};

		const attributes = resolveHostAttributes({
			getReactiveProperties: () => [property],
			getReactivePropDefinitions: () => [],
			getPropertyValue: () => handler,
			getAttributeNames: () => [],
			getAttribute: () => null,
		});

		expect(attributes).toEqual({});
		expect(
			warn.mock.calls.filter((call) => String(call[0]).includes(`reflected attribute "${attribute}"`)),
		).toHaveLength(1);
		expect(warn.mock.calls.some((call) => String(call[0]).includes('secret source'))).toBe(false);
	});

	test('omits a function-valued prop definition and warns once without writing its source', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const handler = () => 'secret source';
		const name = uniqueAttribute('viadefinition');

		const attributes = resolveHostAttributes({
			getReactiveProperties: () => [],
			getReactivePropDefinitions: () => [{ name, options: { type: String } }],
			getPropertyValue: () => handler,
			getAttributeNames: () => [],
			getAttribute: () => null,
		});

		expect(attributes).toEqual({});
		expect(
			warn.mock.calls.filter((call) => String(call[0]).includes(`reflected attribute "${name}"`)),
		).toHaveLength(1);
		expect(warn.mock.calls.some((call) => String(call[0]).includes('secret source'))).toBe(false);
	});

	test.each([
		['Object', Object],
		['Array', Array],
	])('an %s prop that holds a function emits the skip warning and not the lossy one', (kind, type) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const name = uniqueAttribute(`fn-${kind.toLowerCase()}`);

		const attributes = resolveHostAttributes(
			{
				getReactiveProperties: () => [],
				getReactivePropDefinitions: () => [{ name, options: { type } }],
				getPropertyValue: () => () => 'secret source',
				getAttributeNames: () => [],
				getAttribute: () => null,
			},
			uniqueAttribute('tag'),
		);

		const messages = warn.mock.calls.map((call) => String(call[0]));
		expect(attributes).toEqual({});
		expect(messages).toHaveLength(1);
		expect(messages[0]).toContain(`Skipped a function in reflected attribute "${name}"`);
		expect(messages.some((message) => message.includes('JSON cannot represent'))).toBe(false);
	});

	test('an Object prop holding a class instance still gets the lossy warning', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const name = uniqueAttribute('instance');

		resolveHostAttributes(
			{
				getReactiveProperties: () => [],
				getReactivePropDefinitions: () => [{ name, options: { type: Object } }],
				getPropertyValue: () => new (class Box {})(),
				getAttributeNames: () => [],
				getAttribute: () => null,
			},
			uniqueAttribute('tag'),
		);

		expect(warn.mock.calls.filter((call) => String(call[0]).includes('JSON cannot represent'))).toHaveLength(1);
	});
});
