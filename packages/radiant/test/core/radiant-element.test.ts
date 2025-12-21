import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';

class MyRadiantElement extends RadiantElement {
	static observedAttributes = ['number', 'string'];
	declare number: number;
	declare string: string;
}

customElements.define('my-radiant-element', MyRadiantElement);

describe('RadiantElement', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('it renders template correctly', () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		const template = '<p>Hello, template!</p>';
		customElement.renderTemplate({ target: customElement, template, insert: 'replace' });
		expect(customElement.innerHTML).toEqual(template);
	});

	test('it can subscribe to events', () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		customElement.subscribeEvents([
			{
				selector: '[data-ref="click-me"]',
				type: 'click',
				listener: () => {},
			},
			{
				selector: '[data-ref="click-it"]',
				type: 'click',
				listener: () => {},
			},
		]);
		// @ts-expect-error: private property
		expect(customElement.eventSubscriptions.has('click:[data-ref="click-me"]')).toBeTruthy();
		// @ts-expect-error: private property
		expect(customElement.eventSubscriptions.has('click:[data-ref="click-it"]')).toBeTruthy();
	});

	test('it can unsubscribe from events', () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		const [unsubscribeClickMe] = customElement.subscribeEvents([
			{
				selector: '[data-ref="click-me"]',
				type: 'click',
				listener: () => {},
			},
			{
				selector: '[data-ref="click-it"]',
				type: 'click',
				listener: () => {},
			},
		]);

		unsubscribeClickMe();

		// @ts-expect-error: private property
		expect(customElement.eventSubscriptions.has('click:[data-ref="click-me"]')).toBeFalsy();
		// @ts-expect-error: private property
		expect(customElement.eventSubscriptions.has('click:[data-ref="click-it"]')).toBeTruthy();
	});

	test('it can create a reactive property', () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		customElement.createReactiveProp('number', { type: Number, defaultValue: 5 });
		expect(customElement.number).toEqual(5);
		customElement.number = 10;
		expect(customElement.number).toEqual(10);
	});

	test('it can reflect a reactive property to an attribute', async () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		customElement.createReactiveProp('number', { type: Number, defaultValue: 5, reflect: true });
		await waitFor(() => expect(customElement.getAttribute('number')).toEqual('5'));
		customElement.setAttribute('number', '10');
		expect(customElement.getAttribute('number')).toEqual('10');
	});

	test('it can add multiple reactive properties', () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		customElement.createReactiveProp('number', { type: Number, defaultValue: 5 });
		customElement.createReactiveProp('string', { type: String, defaultValue: 'John' });
		expect(customElement.number).toEqual(5);
		expect(customElement.string).toEqual('John');
	});

	test('it can create a reactive field', () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		customElement.createReactiveField('number', 5);
		expect(customElement.number).toEqual(5);
		customElement.number = 10;
		expect(customElement.number).toEqual(10);
	});

	test('it can create multiple reactive fields', () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		customElement.createReactiveField('number', 5);
		customElement.createReactiveField('string', 'John');
		expect(customElement.number).toEqual(5);
		expect(customElement.string).toEqual('John');
	});

	test('it can get a reference to an element', () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		const span = document.createElement('span');
		span.setAttribute('data-ref', 'my-ref');
		customElement.appendChild(span);
		const ref = customElement.getRef('my-ref');
		expect(ref).toEqual(span);
	});

	test('it can get all references to elements', () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		for (let i = 0; i < 3; i++) {
			const span = document.createElement('span');
			span.setAttribute('data-ref', 'my-ref');
			customElement.appendChild(span);
		}
		const refs = customElement.getRef('my-ref', true);
		expect(refs.length).toEqual(3);
	});

	test('reactive updates are triggered by reference change, not in-place mutation', () => {
		let updateCount = 0;
		class ArrayElement extends RadiantElement {
			declare items: string[];
			constructor() {
				super();
				this.createReactiveProp('items', { type: Array, defaultValue: [] });
				this.registerUpdateCallback('items', () => {
					updateCount++;
				});
			}
		}
		customElements.define('array-element', ArrayElement);
		const el = document.createElement('array-element') as ArrayElement;
		document.body.appendChild(el);

		updateCount = 0;

		el.items.push('new item');
		expect(updateCount).toBe(0);

		el.items = [...el.items, 'another item'];
		expect(updateCount).toBe(1);
	});
});
