import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'storybook/test';
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

		const trigger = host.querySelector('[data-select-trigger]') as HTMLDivElement;
		const popup = host.querySelector('[data-select-listbox]') as HTMLElement;
		const options = Array.from(host.querySelectorAll('[data-select-listbox] [role="option"]')) as HTMLElement[];

		expect(trigger.tagName).toBe('DIV');
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

		const trigger = host.querySelector('[data-select-trigger]') as HTMLDivElement;
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

	it('opens on trigger focus when triggerKind is focus', async () => {
		const { host, cleanup } = mount(
			<RuiSelect triggerKind="focus" options={OPTIONS} placeholder="Animals" />,
		);
		await settled();

		const trigger = host.querySelector('[data-select-trigger]') as HTMLDivElement;
		const popup = host.querySelector('[data-select-listbox]') as HTMLElement;

		trigger.focus();
		await settled();

		expect(popup.hidden).toBe(false);
		expect(trigger.getAttribute('aria-expanded')).toBe('true');
		expect(trigger.hasAttribute('aria-activedescendant')).toBe(false);
		cleanup();
	});

	it('opens on click when triggerKind is focus without closing from focus-open', async () => {
		const { host, cleanup } = mount(
			<RuiSelect triggerKind="focus" options={OPTIONS} placeholder="Animals" />,
		);
		await settled();

		const trigger = host.querySelector('[data-select-trigger]') as HTMLDivElement;
		const popup = host.querySelector('[data-select-listbox]') as HTMLElement;

		await userEvent.click(trigger);
		await settled();

		expect(popup.hidden).toBe(false);
		expect(trigger.getAttribute('aria-expanded')).toBe('true');
		cleanup();
	});

	it('opens on Tab when triggerKind is focus', async () => {
		const { host, cleanup } = mount(
			<>
				<button type="button">Before</button>
				<RuiSelect triggerKind="focus" options={OPTIONS} placeholder="Animals" />
			</>,
		);
		await settled();

		const before = host.querySelector('button') as HTMLButtonElement;
		const trigger = host.querySelector('[data-select-trigger]') as HTMLDivElement;
		const popup = host.querySelector('[data-select-listbox]') as HTMLElement;

		before.focus();
		await userEvent.tab();
		await settled();

		expect(document.activeElement).toBe(trigger);
		expect(popup.hidden).toBe(false);
		cleanup();
	});

	it('does not open on trigger focus when triggerKind is manual', async () => {
		const { host, cleanup } = mount(<RuiSelect options={OPTIONS} placeholder="Animals" />);
		await settled();

		const trigger = host.querySelector('[data-select-trigger]') as HTMLDivElement;
		const popup = host.querySelector('[data-select-listbox]') as HTMLElement;

		trigger.focus();
		await settled();

		expect(popup.hidden).toBe(true);
		expect(trigger.getAttribute('aria-expanded')).toBe('false');
		cleanup();
	});

	it('opens on the next Tab after a focused click closes the listbox', async () => {
		const { host, cleanup } = mount(
			<>
				<button type="button">Before</button>
				<RuiSelect triggerKind="focus" options={OPTIONS} />
			</>,
		);
		await settled();

		const before = host.querySelector('button') as HTMLButtonElement;
		const trigger = host.querySelector('[data-select-trigger]') as HTMLDivElement;
		const popup = host.querySelector('[data-select-listbox]') as HTMLElement;

		trigger.focus();
		await settled();
		await userEvent.click(trigger);
		await settled();
		expect(popup.hidden).toBe(true);

		before.focus();
		await userEvent.tab();
		await settled();
		expect(document.activeElement).toBe(trigger);
		expect(popup.hidden).toBe(false);
		cleanup();
	});

	it('does not suppress focus after an aborted pointer interaction', async () => {
		const { host, cleanup } = mount(<RuiSelect triggerKind="focus" options={OPTIONS} />);
		await settled();

		const trigger = host.querySelector('[data-select-trigger]') as HTMLDivElement;
		const popup = host.querySelector('[data-select-listbox]') as HTMLElement;
		trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
		trigger.focus();
		await settled();

		expect(popup.hidden).toBe(false);
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
		const trigger = host.querySelector('[data-select-trigger]') as HTMLDivElement;
		const clear = host.querySelector('[data-select-clear]') as HTMLButtonElement;

		expect(select.value).toEqual(['cat']);
		expect(clear.hidden).toBe(false);

		clear.click();
		await settled();

		expect(select.value).toEqual([]);
		expect(clear.hidden).toBe(true);
		expect(document.activeElement).toBe(trigger);
		cleanup();
	});
});
