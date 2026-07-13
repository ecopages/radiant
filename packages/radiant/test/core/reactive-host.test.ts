import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';

describe('ReactiveHost member state', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('registerUpdateCallback disposer unsubscribes from member state changes', () => {
		let updateCount = 0;

		class CounterElement extends RadiantElement {
			declare count: number;

			constructor() {
				super();
				this.createReactiveField('count', 0);
			}
		}

		customElements.define('reactive-host-counter', CounterElement);

		const element = document.createElement('reactive-host-counter') as CounterElement;
		document.body.appendChild(element);

		const dispose = element.registerUpdateCallback('count', () => {
			updateCount++;
		});

		updateCount = 0;
		element.count = 1;
		expect(updateCount).toBe(1);

		dispose();
		updateCount = 0;
		element.count = 2;
		expect(updateCount).toBe(0);
	});

	test('bindings expose map and member access from the underlying member state', () => {
		class ConfigElement extends RadiantElement<{ config: { label: string } }> {
			declare config: { label: string };

			constructor() {
				super();
				this.createReactiveField('config', { label: 'Hello' });
			}
		}

		customElements.define('reactive-host-config', ConfigElement);

		const element = document.createElement('reactive-host-config') as ConfigElement;
		document.body.appendChild(element);

		const mapped = element.bindings.config.map((config) => (config as { label: string }).label);
		expect(mapped.getValue()).toBe('Hello');

		element.config = { label: 'Next' };
		expect(mapped.getValue()).toBe('Next');
		expect(element.getReactiveMember('config')?.get()).toEqual({ label: 'Next' });
	});

	test('getReactiveMember returns the same state object used by the host property', () => {
		class ValueElement extends RadiantElement {
			declare value: string;

			constructor() {
				super();
				this.createReactiveField('value', 'ready');
			}
		}

		customElements.define('reactive-host-value', ValueElement);

		const element = document.createElement('reactive-host-value') as ValueElement;
		document.body.appendChild(element);

		const member = element.getReactiveMember<string>('value');
		expect(member).toBeDefined();
		expect(member!.get()).toBe('ready');

		element.value = 'done';
		expect(member!.get()).toBe('done');
	});
});
