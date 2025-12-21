import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { onUpdated } from '../../src/decorators/on-updated';

describe('@onUpdated', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	class RadiantCounter extends RadiantElement {
		static observedAttributes = ['value'];
		declare value: number;
		countText!: HTMLElement;

		constructor() {
			super();
			this.createReactiveProp('value', {
				type: Number,
				defaultValue: 3,
			});
		}

		override connectedCallback() {
			super.connectedCallback();
			this.countText = this.getRef<HTMLElement>('count');
		}

		decrement() {
			if (this.value > 0) this.value--;
		}

		increment() {
			this.value++;
		}

		@onUpdated('value')
		updateCount() {
			this.countText.textContent = this.value.toString();
		}
	}

	customElements.define('radiant-counter', RadiantCounter);

	const REACTIVE_PROP = 'value';
	const DATA_REF = 'count';

	const createRadiantCounter = (initialValue?: string) => {
		const customElement = document.createElement('radiant-counter') as RadiantCounter;
		if (initialValue) customElement.setAttribute(REACTIVE_PROP, initialValue);
		const span = document.createElement('span');
		span.setAttribute('data-ref', DATA_REF);
		if (initialValue) span.innerHTML = initialValue;
		customElement.appendChild(span);
		return customElement;
	};

	test('decorator updates the element correctly', () => {
		const customElement = createRadiantCounter('5');
		document.body.appendChild(customElement);
		customElement[REACTIVE_PROP] = 10;
		expect(customElement[REACTIVE_PROP]).toEqual(10);
		expect(customElement.countText.innerHTML).toEqual('10');
		customElement[REACTIVE_PROP] = 15;
		expect(customElement[REACTIVE_PROP]).toEqual(15);
		expect(customElement.countText.innerHTML).toEqual('15');
		customElement.decrement();
		expect(customElement[REACTIVE_PROP]).toEqual(14);
		expect(customElement.countText.innerHTML).toEqual('14');
		customElement.increment();
		expect(customElement[REACTIVE_PROP]).toEqual(15);
		expect(customElement.countText.innerHTML).toEqual('15');
	});

	test('decorator updates the element correctly when setAttribute is used and observedAttributes is defined', () => {
		const customElement = createRadiantCounter('5');
		document.body.appendChild(customElement);
		customElement.setAttribute(REACTIVE_PROP, '10');
		expect(customElement.countText.innerHTML).toEqual('10');
	});

	test('decorator updates the value on load if no value is provided', async () => {
		const customElement = createRadiantCounter();
		document.body.appendChild(customElement);
		expect(customElement[REACTIVE_PROP]).toEqual(3);
		await waitFor(() => expect(customElement.countText.innerHTML).toEqual('3'));
	});

	test('decorator works correctly when multiple elements are created', async () => {
		const customElement1 = createRadiantCounter('5');
		const customElement2 = createRadiantCounter('10');
		const customElement3 = createRadiantCounter();
		document.body.appendChild(customElement1);
		document.body.appendChild(customElement2);
		document.body.appendChild(customElement3);
		customElement1[REACTIVE_PROP] = 15;
		customElement2[REACTIVE_PROP] = 20;
		expect(customElement1.countText.innerHTML).toEqual('15');
		expect(customElement2.countText.innerHTML).toEqual('20');
		await waitFor(() => expect(customElement3.countText.innerHTML).toEqual('3'));
	});

	test('decorator can be used with multiple reactive props', async () => {
		class StepperCounter extends RadiantElement {
			declare value: number;
			declare step: number;
			multiplied = 0;

			constructor() {
				super();
				this.createReactiveProp('value', {
					type: Number,
					defaultValue: 3,
				});
				this.createReactiveProp('step', {
					type: Number,
					defaultValue: 1,
				});
			}

			@onUpdated(['value', 'step'])
			updateCount() {
				this.multiplied = this.value * this.step;
			}
		}

		customElements.define('stepper-counter', StepperCounter);

		const customElement = document.createElement('stepper-counter') as StepperCounter;
		document.body.appendChild(customElement);
		customElement.value = 3;
		customElement.step = 5;
		expect(customElement.multiplied).toEqual(15);
		customElement.value = 5;
		expect(customElement.multiplied).toEqual(25);
		customElement.step = 2;
		expect(customElement.multiplied).toEqual(10);
	});

	test('updating a property in its own @onUpdated callback triggers recursive updates', () => {
		let updateCount = 0;
		class RecursiveElement extends RadiantElement {
			declare value: number;
			constructor() {
				super();
				this.createReactiveProp('value', { type: Number, defaultValue: 0 });
			}

			@onUpdated('value')
			onValueUpdated() {
				updateCount++;
				if (updateCount < 5) {
					this.value++; // Trigger update again
				}
			}
		}
		customElements.define('recursive-element', RecursiveElement);
		const el = document.createElement('recursive-element') as RecursiveElement;
		document.body.appendChild(el);

		expect(updateCount).toBe(0); // Initial notify hasn't run yet

		updateCount = 0;
		el.value = 1;

		// The sequence is:
		// 1. el.value = 1 triggers onValueUpdated.
		// 2. updateCount becomes 1, if(1 < 5) is true, this.value++ triggers onValueUpdated SYNCHRONOUSLY.
		// 3. updateCount becomes 2, if(2 < 5) is true, this.value++ triggers onValueUpdated SYNCHRONOUSLY.
		// 4. updateCount becomes 3, if(3 < 5) is true, this.value++ triggers onValueUpdated SYNCHRONOUSLY.
		// 5. updateCount becomes 4, if(4 < 5) is true, this.value++ triggers onValueUpdated SYNCHRONOUSLY.
		// 6. updateCount becomes 5, if(5 < 5) is FALSE. Stop.

		expect(updateCount).toBe(5);
		expect(el.value).toBe(5);
	});
});
