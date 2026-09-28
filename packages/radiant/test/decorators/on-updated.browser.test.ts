import { waitFor } from '@testing-library/dom';
import { jsx } from '@ecopages/jsx';
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
			this.countText = this.getRef<HTMLElement>('count')!;
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

	test('decorator updates the element after the update cycle', async () => {
		const customElement = createRadiantCounter('5');
		document.body.appendChild(customElement);
		customElement[REACTIVE_PROP] = 10;
		expect(customElement[REACTIVE_PROP]).toEqual(10);
		await customElement.updateComplete;
		expect(customElement.countText.innerHTML).toEqual('10');
		customElement[REACTIVE_PROP] = 15;
		await customElement.updateComplete;
		expect(customElement.countText.innerHTML).toEqual('15');
		customElement.decrement();
		await customElement.updateComplete;
		expect(customElement[REACTIVE_PROP]).toEqual(14);
		expect(customElement.countText.innerHTML).toEqual('14');
		customElement.increment();
		await customElement.updateComplete;
		expect(customElement.countText.innerHTML).toEqual('15');
	});

	test('decorator updates the element when setAttribute is used and observedAttributes is defined', async () => {
		const customElement = createRadiantCounter('5');
		document.body.appendChild(customElement);
		await customElement.updateComplete;
		customElement.setAttribute(REACTIVE_PROP, '10');
		await customElement.updateComplete;
		expect(customElement.countText.innerHTML).toEqual('10');
	});

	test('setAttribute runs @onUpdated once per attribute change', async () => {
		let updateCount = 0;

		class AttributeCounter extends RadiantElement {
			static observedAttributes = ['value'];
			declare value: number;

			constructor() {
				super();
				this.createReactiveProp('value', {
					type: Number,
					defaultValue: 3,
				});
			}

			@onUpdated('value')
			onValueUpdated() {
				updateCount++;
			}
		}

		customElements.define('attribute-counter-on-updated', AttributeCounter);

		const element = document.createElement('attribute-counter-on-updated') as AttributeCounter;
		document.body.appendChild(element);

		await element.updateComplete;
		expect(updateCount).toBe(1);
		updateCount = 0;

		element.setAttribute('value', '10');
		expect(element.value).toBe(10);
		await element.updateComplete;
		expect(updateCount).toBe(1);

		element.setAttribute('value', '10');
		await element.updateComplete;
		expect(updateCount).toBe(1);
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
		await Promise.all([
			customElement1.updateComplete,
			customElement2.updateComplete,
			customElement3.updateComplete,
		]);
		expect(customElement1.countText.innerHTML).toEqual('15');
		expect(customElement2.countText.innerHTML).toEqual('20');
		expect(customElement3.countText.innerHTML).toEqual('3');
	});

	test('writes to several watched members in one turn run the method once', async () => {
		class StepperCounter extends RadiantElement {
			declare value: number;
			declare step: number;
			multiplied = 0;
			runs = 0;

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
				this.runs += 1;
				this.multiplied = this.value * this.step;
			}
		}

		customElements.define('stepper-counter', StepperCounter);

		const customElement = document.createElement('stepper-counter') as StepperCounter;
		document.body.appendChild(customElement);
		await customElement.updateComplete;
		customElement.runs = 0;

		customElement.value = 3;
		customElement.step = 5;
		await customElement.updateComplete;
		expect(customElement.multiplied).toEqual(15);
		expect(customElement.runs).toBe(1);

		customElement.value = 5;
		customElement.step = 2;
		await customElement.updateComplete;
		expect(customElement.multiplied).toEqual(10);
		expect(customElement.runs).toBe(2);
	});

	test('first connect runs a multi-member method once with every adopted attribute', async () => {
		const seen: string[][] = [];

		class TripleProps extends RadiantElement {
			declare a: string;
			declare b: string;
			declare c: string;

			constructor() {
				super();
				this.createReactiveProp('a', { type: String, defaultValue: '' });
				this.createReactiveProp('b', { type: String, defaultValue: '' });
				this.createReactiveProp('c', { type: String, defaultValue: '' });
			}

			@onUpdated(['a', 'b', 'c'])
			onAny(changed: ReadonlySet<string>) {
				seen.push([...changed].sort());
			}
		}

		customElements.define('triple-props-on-updated', TripleProps);

		const element = document.createElement('triple-props-on-updated') as TripleProps;
		element.setAttribute('a', '1');
		element.setAttribute('b', '2');
		element.setAttribute('c', '3');
		document.body.appendChild(element);
		await element.updateComplete;

		expect(seen).toEqual([['a', 'b', 'c']]);
		expect([element.a, element.b, element.c]).toEqual(['1', '2', '3']);
	});

	test('nothing runs before the host connects', async () => {
		let runs = 0;

		class DetachedCounter extends RadiantElement {
			declare value: number;

			constructor() {
				super();
				this.createReactiveProp('value', { type: Number, defaultValue: 0 });
			}

			@onUpdated('value')
			onValueUpdated() {
				runs += 1;
			}
		}

		customElements.define('detached-counter-on-updated', DetachedCounter);

		const element = document.createElement('detached-counter-on-updated') as DetachedCounter;
		element.value = 1;
		element.value = 2;
		await Promise.resolve();
		expect(runs).toBe(0);

		document.body.appendChild(element);
		await element.updateComplete;
		expect(runs).toBe(1);
	});

	test('writes made by the method settle within the same cycle', async () => {
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
					this.value++;
				}
			}
		}
		customElements.define('recursive-element', RecursiveElement);
		const el = document.createElement('recursive-element') as RecursiveElement;
		document.body.appendChild(el);
		await el.updateComplete;

		updateCount = 0;
		el.value = 1;
		expect(updateCount).toBe(0);

		await el.updateComplete;
		expect(updateCount).toBe(5);
		expect(el.value).toBe(5);
	});

	test('runs before the render commit and updated() runs after it', async () => {
		const log: string[] = [];

		class OrderedElement extends RadiantElement {
			declare label: string;

			constructor() {
				super();
				this.createReactiveProp('label', { type: String, defaultValue: 'a' });
			}

			@onUpdated('label')
			onLabelUpdated() {
				log.push(`callback:${this.querySelector('p')?.textContent ?? 'none'}`);
			}

			protected override updated(changed: ReadonlySet<string>): void {
				log.push(`updated:${this.querySelector('p')?.textContent}:${[...changed].join(',')}`);
			}

			override render() {
				return jsx('p', { children: this.label });
			}
		}

		customElements.define('ordered-on-updated', OrderedElement);

		const element = document.createElement('ordered-on-updated') as OrderedElement;
		document.body.appendChild(element);
		await element.updateComplete;
		expect(log).toEqual(['callback:none', 'updated:a:label']);

		log.length = 0;
		element.label = 'b';
		await element.updateComplete;
		expect(log).toEqual(['callback:a', 'updated:b:label']);
	});
});
