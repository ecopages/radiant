import { describe, expect, test } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { attr } from '../../src/decorators/attr';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';

describe('@prop defaultValue', () => {
	test('a null default does not throw', () => {
		@customElement('default-value-prop-null')
		class NullDefault extends RadiantElement {
			@prop({ type: Number, defaultValue: null }) count: number | null;
		}

		const element = new NullDefault();
		document.body.appendChild(element);

		expect(element.count).toBeNull();
	});

	test('a parser owns its default', () => {
		let ParserDefault!: new () => RadiantElement & { count: number };

		expect(() => {
			@customElement('default-value-prop-parser')
			class Defined extends RadiantElement {
				@prop({ type: String, defaultValue: 0, transform: { fromAttribute: (v) => Number(v) } }) count: number;
			}
			ParserDefault = Defined;
		}).not.toThrow();

		const element = new ParserDefault();
		document.body.appendChild(element);
		expect(element.count).toBe(0);
	});

	test('a wrong default without a parser still throws', () => {
		expect(() => {
			@customElement('default-value-prop-wrong')
			class WrongDefault extends RadiantElement {
				@prop({ type: Boolean, defaultValue: 'x' as never }) flag: boolean;
			}
			return WrongDefault;
		}).toThrow('defaultValue does not match the expected type for Boolean');
	});
});

describe('@attr defaultValue', () => {
	test('a null default does not throw', () => {
		class NullDefault extends RadiantController {
			@attr({ source: 'data-count', type: Number, defaultValue: null }) count: number | null;
		}

		const controller = new NullDefault(document.createElement('div'));
		controller.connect();

		expect(controller.count).toBeNull();
	});

	test('a converter owns its default', () => {
		class ConverterDefault extends RadiantController {
			@attr({
				source: 'data-count',
				type: String,
				defaultValue: 0,
				converter: { fromAttribute: (v) => (v === null ? undefined : Number(v)) as number },
			})
			count: number;
		}

		const controller = new ConverterDefault(document.createElement('div'));
		controller.connect();

		expect(controller.count).toBe(0);
	});

	test('a wrong default without a converter still throws', () => {
		class WrongDefault extends RadiantController {
			@attr({ source: 'data-flag', type: Boolean, defaultValue: 'x' as never }) flag: boolean;
		}

		expect(() => new WrongDefault(document.createElement('div')).connect()).toThrow(
			'defaultValue does not match the expected type for Boolean',
		);
	});
});
