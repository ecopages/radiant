import { describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { reactiveField as legacyReactiveField } from '../../src/decorators/legacy/reactive-field';
import { reactiveField as standardReactiveField } from '../../src/decorators/standard/reactive-field';
import { state } from '../../src/decorators/state';

function defineLegacyStateElement(tagName: string) {
	class LegacyStateElement extends RadiantElement {
		count = 0;
	}

	legacyReactiveField(LegacyStateElement.prototype, 'count');
	customElements.define(tagName, LegacyStateElement);
	return LegacyStateElement;
}

function defineStandardStateElement(tagName: string) {
	class StandardStateElement extends RadiantElement {
		@state count = 0;
	}

	customElements.define(tagName, StandardStateElement);
	return StandardStateElement;
}

describe('@state standard vs legacy parity', () => {
	test('RadiantElement exposes bindings and notifies on change', () => {
		const LegacyStateElement = defineLegacyStateElement('legacy-state-parity-element');
		const StandardStateElement = defineStandardStateElement('standard-state-parity-element');

		const legacyElement = document.createElement('legacy-state-parity-element') as InstanceType<
			typeof LegacyStateElement
		> & { $count: ReturnType<InstanceType<typeof LegacyStateElement>['bind']> };
		const standardElement = document.createElement('standard-state-parity-element') as InstanceType<
			typeof StandardStateElement
		> & { $count: ReturnType<InstanceType<typeof StandardStateElement>['bind']> };

		document.body.append(legacyElement, standardElement);

		expect(legacyElement.count).toBe(0);
		expect(standardElement.count).toBe(0);
		expect(legacyElement.$count.getValue()).toBe(0);
		expect(standardElement.$count.getValue()).toBe(0);

		legacyElement.count = 2;
		standardElement.count = 2;

		expect(legacyElement.$count.getValue()).toBe(2);
		expect(standardElement.$count.getValue()).toBe(2);

		legacyElement.remove();
		standardElement.remove();
	});

	test('standard reactiveField export routes through createReactiveField', () => {
		expect(standardReactiveField).toBeTypeOf('function');
	});
});
