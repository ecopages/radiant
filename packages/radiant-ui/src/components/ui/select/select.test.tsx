import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import {
	RuiSelect,
	RuiSelectClear,
	RuiSelectControl,
	RuiSelectListbox,
	RuiSelectToggle,
	RuiSelectTrigger,
	RuiSelectValue,
} from './select';
import { RuiListbox, RuiListboxOption } from '../listbox';
import type { RuiSelect as RuiSelectElement } from './select.script';
import './select.script';

const OPTIONS = [
	{ value: 'cat', label: 'Cat' },
	{ value: 'dog', label: 'Dog' },
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
	await customElements.whenDefined('rui-select');
	await customElements.whenDefined('rui-listbox');
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

describe('RuiSelect', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('keeps the popup open in multiple mode unless shouldCloseOnSelect is set', async () => {
		const { host, cleanup } = mount(<RuiSelect selectionMode="multiple" options={OPTIONS} placeholder="Animals" />);
		await settled();

		const trigger = host.querySelector('[data-select-trigger]') as HTMLButtonElement;
		const popup = host.querySelector('[data-select-listbox]') as HTMLElement;
		const options = Array.from(host.querySelectorAll('[data-select-listbox] [role="option"]')) as HTMLElement[];

		trigger.click();
		await settled();
		expect(popup.hidden).toBe(false);

		options[0].click();
		await settled();
		expect(popup.hidden).toBe(false);
		expect(host.querySelector('rui-select')?.getAttribute('value')).toBe('cat');
		cleanup();
	});

	it('closes on select in multiple mode when shouldCloseOnSelect is true', async () => {
		const { host, cleanup } = mount(
			<RuiSelect selectionMode="multiple" shouldCloseOnSelect options={OPTIONS} placeholder="Animals" />,
		);
		await settled();

		const trigger = host.querySelector('[data-select-trigger]') as HTMLButtonElement;
		const popup = host.querySelector('[data-select-listbox]') as HTMLElement;
		const options = Array.from(host.querySelectorAll('[data-select-listbox] [role="option"]')) as HTMLElement[];

		trigger.click();
		await settled();
		options[0].click();
		await settled();

		expect(popup.hidden).toBe(true);
		expect(document.activeElement).toBe(trigger);
		cleanup();
	});

	it('hides clear until a value exists, then restores the trigger on clear', async () => {
		const { host, cleanup } = mount(
			<RuiSelect value="cat" placeholder="Animals">
				<RuiSelectControl>
					<RuiSelectTrigger>
						<RuiSelectValue />
					</RuiSelectTrigger>
					<RuiSelectClear />
					<RuiSelectToggle />
				</RuiSelectControl>
				<RuiSelectListbox>
					<RuiListbox embedded>
						<RuiListboxOption value="cat">Cat</RuiListboxOption>
						<RuiListboxOption value="dog">Dog</RuiListboxOption>
					</RuiListbox>
				</RuiSelectListbox>
			</RuiSelect>,
		);
		await settled();

		const select = host.querySelector('rui-select') as RuiSelectElement;
		const trigger = host.querySelector('[data-select-trigger]') as HTMLButtonElement;
		const clear = host.querySelector('[data-select-clear]') as HTMLButtonElement;

		expect(select.value).toBe('cat');
		expect(clear.hidden).toBe(false);

		clear.click();
		await settled();

		expect(select.value ?? '').toBe('');
		expect(clear.hidden).toBe(true);
		expect(document.activeElement).toBe(trigger);
		cleanup();
	});
});
