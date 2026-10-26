import { describe, expect, test, vi } from 'vitest';
import { getCustomElementTagName } from '@ecopages/jsx';
import { customElement } from '../../src/decorators/custom-element';

function customElementWithRuntimeExtends(name: string) {
	return Reflect.apply(customElement, undefined, [name, { extends: 'button' }]) as ReturnType<typeof customElement>;
}

@customElement('my-custom-element')
class MyCustomElement extends HTMLElement {
	connectedCallback(): void {
		this.innerHTML = 'Hello, world!';
	}
}

describe('@customElement', () => {
	test('decorator register a custom element correctly', () => {
		const customElement = document.createElement('my-custom-element') as MyCustomElement;
		document.body.appendChild(customElement);
		expect(customElement.innerHTML).toEqual('Hello, world!');
	});

	test('standard decorator rejects customized built-ins before registration', () => {
		const tagName = 'x-standard-customized-built-in-test';
		const decorator = customElementWithRuntimeExtends(tagName);
		const context = {
			addInitializer() {},
		} as unknown as ClassDecoratorContext<CustomElementConstructor>;

		expect(() => decorator(class extends HTMLElement {}, context)).toThrow(
			/customized built-ins are not supported.*autonomous custom element/i,
		);
		expect(customElements.get(tagName)).toBeUndefined();
	});

	test('legacy decorator rejects customized built-ins before registration', () => {
		const tagName = 'x-legacy-customized-built-in-test';
		const decorator = customElementWithRuntimeExtends(tagName);

		expect(() => decorator(class extends HTMLElement {})).toThrow(
			/customized built-ins are not supported.*autonomous custom element/i,
		);
		expect(customElements.get(tagName)).toBeUndefined();
	});

	test('preserves host metadata for SSR when customElements is unavailable', () => {
		const originalRegistry = globalThis.customElements;

		vi.stubGlobal('customElements', undefined);

		try {
			class LegacySsrSafeCustomElement extends HTMLElement {}
			class StandardSsrSafeCustomElement extends HTMLElement {}

			customElement('legacy-ssr-safe-custom-element-test')(LegacySsrSafeCustomElement);

			const initializers: Array<(this: CustomElementConstructor) => void> = [];
			customElement('standard-ssr-safe-custom-element-test')(StandardSsrSafeCustomElement, {
				addInitializer(initializer) {
					initializers.push(initializer as (this: CustomElementConstructor) => void);
				},
			} as ClassDecoratorContext<CustomElementConstructor>);

			for (const initializer of initializers) {
				initializer.call(StandardSsrSafeCustomElement);
			}

			expect(getCustomElementTagName(LegacySsrSafeCustomElement)).toBe('legacy-ssr-safe-custom-element-test');
			expect(getCustomElementTagName(StandardSsrSafeCustomElement)).toBe('standard-ssr-safe-custom-element-test');
		} finally {
			vi.stubGlobal('customElements', originalRegistry);
		}
	});
});
