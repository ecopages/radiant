import { waitFor } from '@testing-library/dom';
import { jsx } from '@ecopages/jsx';
import { beforeEach, describe, expect, test } from 'vitest';
import { installRadiantHydrator, uninstallRadiantHydrator } from '../../src/client/hydrator';
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
		uninstallRadiantHydrator();
	});

	test('renderTemplate replace replaces inner content', () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		customElement.innerHTML = '<span>old</span>';
		customElement.renderTemplate({ target: customElement, template: '<p>new</p>', insert: 'replace' });
		expect(customElement.innerHTML).toEqual('<p>new</p>');
	});

	test('renderTemplate beforeend appends inside target', () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		customElement.innerHTML = '<span>first</span>';
		customElement.renderTemplate({ target: customElement, template: '<span>second</span>', insert: 'beforeend' });
		expect(customElement.innerHTML).toEqual('<span>first</span><span>second</span>');
	});

	test('renderTemplate afterbegin prepends inside target', () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		customElement.innerHTML = '<span>first</span>';
		customElement.renderTemplate({ target: customElement, template: '<span>zero</span>', insert: 'afterbegin' });
		expect(customElement.innerHTML).toEqual('<span>zero</span><span>first</span>');
	});

	test('renderTemplate beforebegin inserts before the target', () => {
		const wrapper = document.createElement('div');
		const target = document.createElement('div');
		target.id = 'target';
		wrapper.appendChild(target);
		document.body.appendChild(wrapper);
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		customElement.renderTemplate({ target, template: '<span>before</span>', insert: 'beforebegin' });
		expect(wrapper.innerHTML).toEqual('<span>before</span><div id="target"></div>');
	});

	test('renderTemplate afterend inserts after the target', () => {
		const wrapper = document.createElement('div');
		const target = document.createElement('div');
		target.id = 'target';
		wrapper.appendChild(target);
		document.body.appendChild(wrapper);
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		customElement.renderTemplate({ target, template: '<span>after</span>', insert: 'afterend' });
		expect(wrapper.innerHTML).toEqual('<div id="target"></div><span>after</span>');
	});

	test('renderTemplate without sanitize passes template through unchanged', () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		const template = '<p>raw</p>';
		customElement.renderTemplate({ target: customElement, template });
		expect(customElement.innerHTML).toEqual('<p>raw</p>');
	});

	test('renderTemplate with sanitize transforms template before insertion', () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		const sanitize = (html: string) => html.replace(/<script[^>]*>.*?<\/script>/gi, '');
		customElement.renderTemplate({
			target: customElement,
			template: '<p>safe</p><script>alert(1)</script>',
			sanitize,
		});
		expect(customElement.innerHTML).toEqual('<p>safe</p>');
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
		expect(customElement.hasEventSubscription('click:[data-ref="click-me"]')).toBeTruthy();
		expect(customElement.hasEventSubscription('click:[data-ref="click-it"]')).toBeTruthy();
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

		expect(customElement.hasEventSubscription('click:[data-ref="click-me"]')).toBeFalsy();
		expect(customElement.hasEventSubscription('click:[data-ref="click-it"]')).toBeTruthy();
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

	test('it returns null when a single ref is not found', () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		const ref = customElement.getRef('nonexistent');
		expect(ref).toBeNull();
	});

	test('it returns an empty array when all refs are not found', () => {
		const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
		document.body.appendChild(customElement);
		const refs = customElement.getRef('nonexistent', true);
		expect(refs).toEqual([]);
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

	test('does not hydrate again when an SSR host reconnects', async () => {
		class ReconnectingSsrElement extends RadiantElement {
			hydrateCount = 0;

			override hydrate(): void {
				this.hydrateCount += 1;
				super.hydrate();
			}

			override render() {
				return jsx('div', {});
			}
		}

		customElements.define('reconnecting-ssr-element', ReconnectingSsrElement);
		installRadiantHydrator();

		const element = document.createElement('reconnecting-ssr-element') as ReconnectingSsrElement;
		element.innerHTML = '<div data-radiant-jsx-bind-0="attr:class"></div>';
		document.body.appendChild(element);

		await waitFor(() => expect(element.hydrateCount).toBe(1));

		element.remove();
		document.body.appendChild(element);

		await Promise.resolve();
		expect(element.hydrateCount).toBe(1);
	});

	test('does not update again when a mounted host reconnects', async () => {
		class MountedReconnectElement extends RadiantElement {
			updateCount = 0;

			override update(): void {
				this.updateCount += 1;
				super.update();
			}

			override render() {
				return jsx('div', {
					'data-ref': 'content',
					class: 'slot-content',
					style: { height: '200px', overflow: 'auto' },
					children: jsx('slot', {}),
				});
			}
		}

		customElements.define('mounted-reconnect-element', MountedReconnectElement);

		const element = document.createElement('mounted-reconnect-element') as MountedReconnectElement;
		element.innerHTML = '<div style="height: 1200px">Nav</div>';
		document.body.appendChild(element);

		await waitFor(() => expect(element.updateCount).toBe(1));

		const content = element.querySelector('[data-ref="content"]') as HTMLElement;
		content.scrollTop = 180;

		element.remove();
		document.body.appendChild(element);

		await Promise.resolve();
		await Promise.resolve();

		expect(element.updateCount).toBe(1);
		expect(content.scrollTop).toBe(180);
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
