import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { RuiField } from './field';
import { RuiLabel } from '../label';
import { RuiListbox } from '../listbox';
import './field.script';
import '../listbox/listbox.script';

function mount(element: JsxRenderable): { host: HTMLElement; cleanup: () => void } {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root = createRoot(host);
	root.render(element);
	return {
		host,
		cleanup: () => {
			root.unmount();
			host.remove();
		},
	};
}

async function settled(): Promise<void> {
	await customElements.whenDefined('rui-field');
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

describe('RuiField labeling', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('associates a native input with htmlFor only', async () => {
		const { host, cleanup } = mount(
			<RuiField name="email">
				<RuiLabel>Email</RuiLabel>
				<input data-rui-control type="email" />
			</RuiField>,
		);
		await settled();

		const input = host.querySelector('input') as HTMLInputElement;
		const label = host.querySelector('label') as HTMLLabelElement;
		expect(input.id).toBeTruthy();
		expect(label.htmlFor).toBe(input.id);
		expect(input.hasAttribute('aria-labelledby')).toBe(false);
		cleanup();
	});

	it('associates a listbox with aria-labelledby', async () => {
		const { host, cleanup } = mount(
			<RuiField name="framework">
				<RuiLabel>Framework</RuiLabel>
				<RuiListbox
					label="Framework"
					options={[
						{ value: 'radiant', label: 'Radiant' },
						{ value: 'react', label: 'React' },
					]}
				/>
			</RuiField>,
		);
		await settled();
		await customElements.whenDefined('rui-listbox');

		const list = host.querySelector('[role="listbox"]') as HTMLElement;
		const label = host.querySelector('label') as HTMLLabelElement;
		expect(label.htmlFor).toBe(list.id);
		expect(list.getAttribute('aria-labelledby')).toBe(label.id);
		expect(list.hasAttribute('aria-label')).toBe(false);
		cleanup();
	});
});
