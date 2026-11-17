import { waitFor } from '@testing-library/dom';
import { describe, expect, test, vi } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { attr } from '../../src/decorators/attr';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { prop } from '../../src/decorators/prop';

@customElement('attr-element-test')
class AttrElement extends RadiantElement<{ count: number; state: string | undefined }> {
	@attr({ source: 'data-state' }) state?: string;
	@attr({ source: 'data-count', type: Number })
	count = 0;
	@attr({ source: 'data-active', type: Boolean })
	active = false;
}

class AttrController extends RadiantController<{ count: number; state: string | undefined }> {
	@attr({ source: 'data-state' }) state?: string;
	@attr({ source: 'data-count', type: Number }) count = 0;
}

class AttrReconnectController extends RadiantController<{ state: string | undefined }> {
	@attr({ source: 'data-state' }) state?: string;
	updates: string[] = [];

	@onUpdated('state')
	handleStateUpdate() {
		this.updates.push(this.state ?? 'undefined');
	}
}

@customElement('attr-underscore-name-test')
class AttrUnderscoreNameElement extends RadiantElement {
	@attr({ type: Number }) max_Width = 0;
}

@customElement('attr-double-underscore-name-test')
class AttrDoubleUnderscoreNameElement extends RadiantElement {
	@attr({ type: Number }) max__Width = 0;
}

@customElement('prop-underscore-name-test')
class PropUnderscoreNameElement extends RadiantElement {
	@prop({ type: Number, reflect: true }) max_Width = 0;
}

@customElement('prop-double-underscore-name-test')
class PropDoubleUnderscoreNameElement extends RadiantElement {
	@prop({ type: Number, reflect: true }) max__Width = 0;
}

describe('@attr', () => {
	test('uses the same default attribute name as @prop for underscored fields', () => {
		const attrElement = document.createElement('attr-underscore-name-test') as AttrUnderscoreNameElement;
		const propElement = document.createElement('prop-underscore-name-test') as PropUnderscoreNameElement;
		document.body.append(attrElement, propElement);

		attrElement.max_Width = 2;
		propElement.max_Width = 2;

		expect(attrElement.getAttribute('max-width')).toBe('2');
		expect(propElement.getAttribute('max-width')).toBe('2');
	});

	test('collapses consecutive underscores to one hyphen, as @prop does', () => {
		const attrElement = document.createElement(
			'attr-double-underscore-name-test',
		) as AttrDoubleUnderscoreNameElement;
		const propElement = document.createElement(
			'prop-double-underscore-name-test',
		) as PropDoubleUnderscoreNameElement;
		document.body.append(attrElement, propElement);

		attrElement.max__Width = 3;
		propElement.max__Width = 3;

		expect(attrElement.getAttribute('max--width')).toBeNull();
		expect(attrElement.getAttribute('max-width')).toBe('3');
		expect(propElement.getAttribute('max-width')).toBe('3');
	});

	test('reads and reacts to element attributes', async () => {
		const element = document.createElement('attr-element-test') as AttrElement;
		element.setAttribute('data-state', 'ready');
		element.setAttribute('data-count', '2');
		element.setAttribute('data-active', '');
		document.body.appendChild(element);

		expect(element.state).toBe('ready');
		expect(element.count).toBe(2);
		expect(element.active).toBe(true);
		expect(element.$.count.getValue()).toBe(2);

		element.setAttribute('data-state', 'done');
		element.setAttribute('data-count', '4');
		element.removeAttribute('data-active');

		await waitFor(() => {
			expect(element.state).toBe('done');
			expect(element.bindings.count.getValue()).toBe(4);
			expect(element.active).toBe(false);
		});
	});

	test('writes back through the attribute channel', async () => {
		const element = document.createElement('attr-element-test') as AttrElement;
		document.body.appendChild(element);

		element.state = 'archived';
		element.count = 6;
		element.active = true;

		await waitFor(() => {
			expect(element.getAttribute('data-state')).toBe('archived');
			expect(element.getAttribute('data-count')).toBe('6');
			expect(element.getAttribute('data-active')).toBe('true');
		});
	});
});

@customElement('attr-function-value-test')
class AttrFunctionValue extends RadiantElement {
	@attr({ source: 'data-fn' }) value?: string;
}

@customElement('attr-function-value-other-test')
class AttrFunctionValueOther extends RadiantElement {
	@attr({ source: 'data-fn' }) value?: string;
}

describe('@attr function values', () => {
	test('removes the attribute instead of writing the function source, and warns once', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const element = document.createElement('attr-function-value-test') as AttrFunctionValue;
		element.setAttribute('data-fn', 'seeded');
		document.body.appendChild(element);

		element.value = (() => 'secret source') as unknown as string;
		element.value = (() => 'other source') as unknown as string;

		await waitFor(() => expect(element.hasAttribute('data-fn')).toBe(false));
		const messages = warn.mock.calls.map((call) => String(call[0]));
		expect(messages.filter((message) => message.includes('@attr "data-fn" of AttrFunctionValue'))).toHaveLength(1);
		expect(messages.some((message) => message.includes('secret source'))).toBe(false);
		warn.mockRestore();
	});

	test('names the host, so another class with the same attribute warns on its own', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const element = document.createElement('attr-function-value-other-test') as AttrFunctionValueOther;
		document.body.appendChild(element);

		element.value = (() => 'secret source') as unknown as string;

		const messages = warn.mock.calls.map((call) => String(call[0]));
		expect(
			messages.filter((message) => message.includes('@attr "data-fn" of AttrFunctionValueOther')),
		).toHaveLength(1);
		warn.mockRestore();
	});
});

describe('RadiantController @attr', () => {
	test('tracks host data attributes reactively', async () => {
		const host = document.createElement('div');
		host.setAttribute('data-state', 'idle');
		host.setAttribute('data-count', '3');
		const controller = new AttrController(host);

		controller.connect();
		expect(controller.state).toBe('idle');
		expect(controller.count).toBe(3);

		host.setAttribute('data-state', 'ready');
		host.setAttribute('data-count', '7');

		await waitFor(() => {
			expect(controller.state).toBe('ready');
			expect(controller.count).toBe(7);
			expect(controller.bindings.state.getValue()).toBe('ready');
		});
	});

	test('does not duplicate attr updates across disconnect and reconnect', async () => {
		const host = document.createElement('div');
		host.setAttribute('data-state', 'idle');
		const controller = new AttrReconnectController(host);

		controller.connect();

		await waitFor(() => {
			expect(controller.state).toBe('idle');
		});

		controller.disconnect();
		host.setAttribute('data-state', 'ready');
		controller.connect();

		await waitFor(() => {
			expect(controller.state).toBe('ready');
		});

		controller.updates.length = 0;
		host.setAttribute('data-state', 'done');

		await waitFor(() => {
			expect(controller.state).toBe('done');
			expect(controller.updates).toEqual(['done']);
		});
	});
});
