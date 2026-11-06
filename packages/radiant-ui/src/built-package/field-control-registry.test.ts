import { describe, expect, it } from 'vitest';

/**
 * Imports the built package (`dist/`), not `src/`, because the defect only exists once each entry is bundled.
 *
 * @remarks Run `pnpm run build:files` first; `test:all` does it through `build:storybook-deps`.
 */
describe('field control registry across built entries', () => {
	it('submits a custom control registered from the form entry inside rui-field', async () => {
		const { registerFieldControl } = await import('../../dist/components/ui/form/index.js');
		await import('../../dist/components/ui/field/index.js');

		class RegionControl extends HTMLElement {
			static formAssociated = true;
			private internals = this.attachInternals();
			connectedCallback(): void {
				this.internals.setFormValue(this.getAttribute('value') ?? '');
			}
		}
		customElements.define('x-region-control', RegionControl);
		registerFieldControl('x-region-control', {
			read: (host) => host.getAttribute('value') ?? '',
			write: (host, value) => host.setAttribute('value', String(value ?? '')),
			submission: 'host',
		});

		const form = document.createElement('form');
		form.innerHTML = `<rui-field name="region"><x-region-control value="emea"></x-region-control></rui-field>`;
		document.body.append(form);
		await customElements.whenDefined('rui-field');
		await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

		const control = form.querySelector('x-region-control')!;
		expect(control.getAttribute('name')).toBe('region');
		expect(new FormData(form).get('region')).toBe('emea');
		form.remove();
	});
});
