import { createRoot, type JsxCustomElementAttributes } from '@ecopages/jsx';
import { describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'prop-upgrade-jsx': JsxCustomElementAttributes<RadiantElement, { value?: string }>;
	}
}

@customElement('prop-upgrade-jsx')
class JsxValueHost extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: '' }) value = '';
}

function defineValueHost(tagName: string): void {
	@customElement(tagName)
	class ValueHost extends RadiantElement {
		@prop({ type: String, reflect: true, defaultValue: '' }) value = '';
	}
}

describe('custom-element property upgrade in Chromium', () => {
	test('adopts an attribute authored before upgrade', async () => {
		const tagName = `prop-upgrade-attribute-${crypto.randomUUID()}`;
		const element = document.createElement(tagName) as HTMLElement & { value: string };
		element.setAttribute('value', 'ts');
		defineValueHost(tagName);
		document.body.append(element);

		await Promise.resolve();

		expect(element.value).toBe('ts');
		expect(element.getAttribute('value')).toBe('ts');
	});

	test('keeps a property authored before upgrade authoritative over an attribute', async () => {
		const tagName = `prop-upgrade-property-${crypto.randomUUID()}`;
		const element = document.createElement(tagName) as HTMLElement & { value: string };
		element.setAttribute('value', 'js');
		element.value = 'ts';
		defineValueHost(tagName);
		document.body.append(element);

		await Promise.resolve();

		expect(element.value).toBe('ts');
		expect(element.getAttribute('value')).toBe('ts');
	});

	test('applies a deferred JSX property before first-connect sync', async () => {
		const container = document.createElement('div');
		document.body.append(container);
		const root = createRoot(container);
		root.render(<prop-upgrade-jsx value="ts" />);

		await Promise.resolve();

		const element = container.querySelector('prop-upgrade-jsx') as JsxValueHost;
		expect(element.value).toBe('ts');
		expect(element.getAttribute('value')).toBe('ts');
		root.unmount();
	});

	test('keeps an authored value attribute on an already-defined host', async () => {
		const element = document.createElement('prop-upgrade-jsx') as JsxValueHost;
		element.setAttribute('value', 'ts');
		document.body.append(element);

		await Promise.resolve();

		expect(element.value).toBe('ts');
		expect(element.getAttribute('value')).toBe('ts');
		element.remove();
	});
});
