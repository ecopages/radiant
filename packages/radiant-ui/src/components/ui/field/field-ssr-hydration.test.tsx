import { describe, expect, it } from 'vitest';
import { runSsrPreparationCallbacks } from '@ecopages/radiant';
import { RUI_FIELD_MANAGED_ATTR } from '../form/control-protocol';
import type { RuiField as RuiFieldElement } from './field.script';
import './field.script';

async function flushRender(): Promise<void> {
	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => resolve());
		});
	});
}

describe('RuiField rules hydration via fieldContext', () => {
	it('publishes rules onto fieldProvider during SSR prep, stripping the validate function', () => {
		const field = document.createElement('rui-field') as RuiFieldElement;
		field.name = 'email';
		field.rules = { required: 'Email is required', validate: () => true };

		// Simulates what a real SSR render triggers via ensureReady() — connectedCallback
		// never runs during real SSR, so this is the only place this logic can execute.
		runSsrPreparationCallbacks(field);

		const scriptMarkup = field.fieldProvider.renderHydrationScriptTag();
		expect(scriptMarkup).toContain(
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="fieldProvider">',
		);
		expect(scriptMarkup).toContain('"required":"Email is required"');
		expect(scriptMarkup).not.toContain('validate');
	});

	it('recovers rules from an SSR-authored hydration script, without any rules prop ever set client-side', async () => {
		document.body.innerHTML =
			'<rui-field name="email">' +
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="fieldProvider">' +
			'{"name":"email","controlId":"","descriptionId":"","errorId":"","invalid":false,"required":false,"rules":{"required":"Email is required"}}' +
			'</script>' +
			'<input data-rui-control type="email" />' +
			'</rui-field>';

		await customElements.whenDefined('rui-field');
		await flushRender();
		await new Promise<void>((resolve) => queueMicrotask(() => queueMicrotask(resolve)));

		const field = document.querySelector('rui-field') as RuiFieldElement;
		expect(field.rules).toBeFalsy();

		const input = field.querySelector(`input[${RUI_FIELD_MANAGED_ATTR}]`) as HTMLInputElement;
		expect(input).not.toBeNull();
		expect(input.getAttribute('aria-required')).toBe('true');

		document.body.innerHTML = '';
	});
});
