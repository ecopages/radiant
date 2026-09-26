import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { RuiCombobox } from './combobox';
import type { RuiCombobox as RuiComboboxElement } from './combobox.script';
import './combobox.script';

const OPTIONS = [
	{ value: 'de', label: 'Germany' },
	{ value: 'it', label: 'Italy' },
];

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
	await customElements.whenDefined('rui-combobox');
	await customElements.whenDefined('rui-listbox');
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

describe('RuiCombobox', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('resolves the input from option values rather than raw data-value only', async () => {
		const { host, cleanup } = mount(<RuiCombobox value="de" options={OPTIONS} placeholder="Country" />);
		await settled();

		const input = host.querySelector('[data-combobox-input]') as HTMLInputElement;
		expect(input.value).toBe('Germany');
		cleanup();
	});

	it('keeps the popup open while toggling multiple values', async () => {
		const { host, cleanup } = mount(
			<RuiCombobox selectionMode="multiple" options={OPTIONS} placeholder="Countries" />,
		);
		await settled();

		const trigger = host.querySelector('[data-combobox-trigger]') as HTMLButtonElement;
		const popup = host.querySelector('[data-combobox-listbox]') as HTMLElement;
		const options = Array.from(host.querySelectorAll('[data-combobox-listbox] [role="option"]')) as HTMLElement[];
		const combobox = host.querySelector('rui-combobox') as RuiComboboxElement;

		trigger.click();
		await settled();
		options[0].click();
		await settled();
		options[1].click();
		await settled();

		expect(popup.hidden).toBe(false);
		expect(combobox.value).toEqual(['de', 'it']);
		cleanup();
	});

	it('opens on the next Tab after selecting closes the listbox with the input focused', async () => {
		const { host, cleanup } = mount(
			<>
				<button type="button">Before</button>
				<RuiCombobox triggerKind="focus" options={OPTIONS} placeholder="Country" />
			</>,
		);
		await settled();

		const before = host.querySelector('button') as HTMLButtonElement;
		const input = host.querySelector('[data-combobox-input]') as HTMLInputElement;
		const popup = host.querySelector('[data-combobox-listbox]') as HTMLElement;
		const options = Array.from(host.querySelectorAll('[data-combobox-listbox] [role="option"]')) as HTMLElement[];

		await userEvent.click(input);
		await settled();
		expect(popup.hidden).toBe(false);

		await userEvent.click(options[0]);
		await settled();
		expect(popup.hidden).toBe(true);
		expect(document.activeElement).toBe(input);

		before.focus();
		await userEvent.tab();
		await settled();
		expect(document.activeElement).toBe(input);
		expect(popup.hidden).toBe(false);
		cleanup();
	});
});
