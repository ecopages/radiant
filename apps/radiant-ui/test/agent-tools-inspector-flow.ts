import { expect } from 'vitest';
import { mountRecipe } from './mount-recipe';
import { until } from './until';

/**
 * Mounts the plain agent tools example and the docs inspector under it, as the page does, then checks that the
 * inspector offers the registered tool and that calling it from there changes the cart. The caller sets up
 * `document.modelContext` and imports the inspector first, so both exist when the example registers its tool.
 */
export async function expectInspectorCallsTheCart(): Promise<void> {
	const root = await mountRecipe('agent-tools');
	root.insertAdjacentHTML(
		'afterend',
		`<tool-inspector>
			<ul aria-label="Registered tools"></ul>
			<textarea aria-label="Tool input" rows="2">{"sku": "pear"}</textarea>
			<p data-result aria-live="polite"></p>
		</tool-inspector>`,
	);
	const inspector = document.querySelector('tool-inspector')!;

	await until(() =>
		expect([...inspector.querySelectorAll('li')].map((item) => item.textContent)).toEqual(['Call add_to_cart']),
	);

	inspector.querySelector<HTMLButtonElement>('[data-call="add_to_cart"]')!.click();

	await until(() => expect(inspector.querySelector('[data-result]')!.textContent).toBe('{"count":1}'));
	expect([...root.querySelectorAll('li')].map((item) => item.textContent)).toEqual(['pear']);
	expect(root.querySelector('[data-status]')!.textContent).toBe('1 in cart');
}
