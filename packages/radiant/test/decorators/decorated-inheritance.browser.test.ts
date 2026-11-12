import { afterEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';
import { state } from '../../src/decorators/state';

let counter = 0;
const nextTag = (kind: string) => `decorated-inheritance-${kind}-${++counter}`;

describe('decorated and undecorated subclasses of a decorated class', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	test('a decorated subclass keeps reactive fields on both levels', async () => {
		@customElement(nextTag('base'))
		class Base extends RadiantElement {
			@state baseCount = 1;
			@prop({ type: String }) label = 'base';
		}

		@customElement(nextTag('child'))
		class Child extends Base {
			@state count = 1;
			@prop({ type: Number }) size = 2;
		}

		const host = new Child();
		document.body.appendChild(host);
		await Promise.resolve();
		const changed: string[] = [];
		const stopCount = host.registerUpdateCallback('count', () => changed.push('count'));
		const stopBase = host.registerUpdateCallback('baseCount', () => changed.push('baseCount'));

		host.count = 5;
		host.baseCount = 6;

		expect(host.count).toBe(5);
		expect(changed).toEqual(['count', 'baseCount']);
		stopCount();
		stopBase();
	});

	test('the precedence matrix holds for a decorated subclass', () => {
		@customElement(nextTag('base'))
		class Base extends RadiantElement {
			@prop({ type: String }) label = 'base';
		}

		@customElement(nextTag('child'))
		class Child extends Base {
			@prop({ type: String }) heading = 'child';
		}

		const host = new Child();
		host.setAttribute('heading', 'authored');
		host.heading = 'assigned';
		document.body.appendChild(host);

		expect(host.heading).toBe('assigned');
	});

	test('an undecorated subclass of a decorated class still gets reactive fields', async () => {
		@customElement(nextTag('base'))
		class Base extends RadiantElement {
			@state baseCount = 1;
		}

		class Plain extends Base {
			@state count = 1;
		}
		const tag = nextTag('plain');
		customElements.define(tag, Plain);

		const host = document.createElement(tag) as Plain;
		document.body.appendChild(host);
		await Promise.resolve();
		const changed: string[] = [];
		const stop = host.registerUpdateCallback('count', () => changed.push('count'));

		host.count = 3;

		expect(changed).toEqual(['count']);
		stop();
	});
});
