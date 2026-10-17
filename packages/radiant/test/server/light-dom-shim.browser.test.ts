import { expect, test } from 'vitest';
import { installLightDomShim } from '../../src/server/light-dom-shim';

test('explicit SSR setup is a safe no-op when a DOM is already available', () => {
	const initialRegistry = globalThis.customElements;
	const initialHTMLElement = globalThis.HTMLElement;
	const initialWindow = globalThis.window;
	const initialBody = document.body;
	document.body.innerHTML = '<p data-preserved="true">kept</p>';
	const runtime = installLightDomShim();

	expect(runtime.customElements).toBe(initialRegistry);
	expect(runtime.HTMLElement).toBe(initialHTMLElement);
	expect(globalThis.window).toBe(initialWindow);
	expect(document.body).toBe(initialBody);
	expect(document.body.innerHTML).toBe('<p data-preserved="true">kept</p>');
	document.body.innerHTML = '';
});
