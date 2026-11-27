import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { RuiCombobox } from './combobox';
import { RuiCombobox as RuiComboboxElement } from './combobox.script';
void RuiComboboxElement;

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

	it('shows every option again after a native form reset clears the typed filter', async () => {
		const { host, cleanup } = mount(
			<form>
				<RuiCombobox options={OPTIONS} placeholder="Country" />
			</form>,
		);
		await settled();

		const form = host.querySelector('form') as HTMLFormElement;
		const input = host.querySelector('[data-combobox-input]') as HTMLInputElement;
		const options = Array.from(host.querySelectorAll('[data-combobox-listbox] [role="option"]')) as HTMLElement[];

		await userEvent.type(input, 'ita');
		await settled();
		expect(options.filter((option) => !option.hidden)).toHaveLength(1);

		form.reset();
		await settled();

		expect(input.value).toBe('');
		expect(options.every((option) => !option.hidden)).toBe(true);
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

	it('points the input and trigger aria-controls at the listbox id', async () => {
		const { host, cleanup } = mount(<RuiCombobox options={OPTIONS} placeholder="Country" />);
		await settled();

		const input = host.querySelector('[data-combobox-input]') as HTMLInputElement;
		const trigger = host.querySelector('[data-combobox-trigger]') as HTMLButtonElement;
		const listbox = host.querySelector('[role="listbox"]') as HTMLElement;
		expect(listbox.id).not.toBe('');
		listbox.id = 'preset-listbox-id';
		trigger.click();
		await settled();
		(host.querySelector('[role="option"]') as HTMLElement).click();
		await settled();
		expect(input.getAttribute('aria-controls')).toBe(listbox.id);
		expect(trigger.getAttribute('aria-controls')).toBe(listbox.id);
		expect(document.getElementById(input.getAttribute('aria-controls') as string)).toBe(listbox);
		cleanup();
	});

	it('clears the value on Escape when the closed input text was erased', async () => {
		const { host, cleanup } = mount(<RuiCombobox value="de" options={OPTIONS} placeholder="Country" />);
		await settled();

		const input = host.querySelector('[data-combobox-input]') as HTMLInputElement;
		const popup = host.querySelector('[data-combobox-listbox]') as HTMLElement;
		const combobox = host.querySelector('rui-combobox') as RuiComboboxElement;
		const changes: unknown[] = [];
		combobox.addEventListener('change', (event) => {
			if (event.target === combobox) changes.push(combobox.value);
		});

		await userEvent.click(input);
		await userEvent.clear(input);
		await settled();
		for (let i = 0; i < 3 && !popup.hidden; i++) {
			await userEvent.keyboard('{Escape}');
			await settled();
		}
		expect(popup.hidden).toBe(true);
		expect(input.value).toBe('');
		expect(combobox.value).toEqual(['de']);

		await userEvent.keyboard('{Escape}');
		await settled();
		expect(combobox.value).toEqual([]);
		expect(changes.at(-1)).toEqual([]);
		cleanup();
	});

	it('keeps chips when Escape runs on a closed multiple-mode combobox with empty text', async () => {
		const { host, cleanup } = mount(
			<RuiCombobox selectionMode="multiple" value="de,it" options={OPTIONS} placeholder="Countries" />,
		);
		await settled();

		const input = host.querySelector('[data-combobox-input]') as HTMLInputElement;
		const combobox = host.querySelector('rui-combobox') as RuiComboboxElement;
		const before = [...combobox.value];
		expect(before.length).toBeGreaterThan(0);
		input.focus();
		await userEvent.keyboard('{Escape}');
		await settled();
		expect(combobox.value).toEqual(before);
		cleanup();
	});

	it('keeps every pick when Tab leaves an open multiple-mode combobox with an active option', async () => {
		const { host, cleanup } = mount(
			<>
				<RuiCombobox selectionMode="multiple" value="de,it" options={OPTIONS} placeholder="Countries" />
				<button type="button" data-after>
					After
				</button>
			</>,
		);
		await settled();

		const input = host.querySelector('[data-combobox-input]') as HTMLInputElement;
		const popup = host.querySelector('[data-combobox-listbox]') as HTMLElement;
		const combobox = host.querySelector('rui-combobox') as RuiComboboxElement;
		input.focus();
		await userEvent.keyboard('{ArrowDown}');
		await settled();
		expect(popup.hidden).toBe(false);
		expect(input.getAttribute('aria-activedescendant')).toBeTruthy();

		await userEvent.tab();
		await settled();

		expect(combobox.value).toEqual(['de', 'it']);
		expect(popup.hidden).toBe(true);
		expect(document.activeElement).toBe(host.querySelector('[data-after]'));
		cleanup();
	});

	it('picks the active option when Tab leaves an open single-mode combobox', async () => {
		const { host, cleanup } = mount(
			<>
				<RuiCombobox options={OPTIONS} placeholder="Country" />
				<button type="button" data-after>
					After
				</button>
			</>,
		);
		await settled();

		const input = host.querySelector('[data-combobox-input]') as HTMLInputElement;
		const popup = host.querySelector('[data-combobox-listbox]') as HTMLElement;
		const combobox = host.querySelector('rui-combobox') as RuiComboboxElement;
		input.focus();
		await userEvent.keyboard('{ArrowDown}');
		await settled();
		expect(popup.hidden).toBe(false);

		await userEvent.tab();
		await settled();

		expect(combobox.value).toEqual(['de']);
		expect(popup.hidden).toBe(true);
		expect(document.activeElement).toBe(host.querySelector('[data-after]'));
		cleanup();
	});

	it('wires the popup when its children are added after the element connects', async () => {
		const { host: source, cleanup: cleanupSource } = mount(<RuiCombobox options={OPTIONS} placeholder="Country" />);
		await settled();
		const markup = (source.querySelector('rui-combobox') as RuiComboboxElement).innerHTML;
		cleanupSource();

		const combobox = document.createElement('rui-combobox') as RuiComboboxElement;
		document.body.append(combobox);
		combobox.innerHTML = markup;
		await settled();

		(combobox.querySelector('[data-combobox-trigger]') as HTMLElement).click();
		await settled();
		(combobox.querySelector('[role="option"][data-value="it"]') as HTMLElement).click();
		await settled();

		expect(combobox.value).toEqual(['it']);
	});

	describe('options that arrive after the input event', () => {
		function addOptions(host: HTMLElement, labels: string[]): void {
			const listbox = host.querySelector('[role="listbox"]') as HTMLElement;
			for (const label of labels) {
				const option = document.createElement('div');
				option.setAttribute('role', 'option');
				option.setAttribute('data-value', label.toLowerCase());
				option.textContent = label;
				listbox.append(option);
			}
		}

		it('opens the listbox when suggestions load after the visitor typed', async () => {
			const { host, cleanup } = mount(<RuiCombobox options={[]} placeholder="Search" />);
			await settled();

			const input = host.querySelector('[data-combobox-input]') as HTMLInputElement;
			const popup = host.querySelector('[data-combobox-listbox]') as HTMLElement;

			await userEvent.type(input, 'chair');
			await settled();
			expect(popup.hidden).toBe(true);

			addOptions(host, ['Chair', 'Table', 'Armchair']);
			await settled();

			expect(popup.hidden).toBe(false);
			expect(input.getAttribute('aria-expanded')).toBe('true');
			const visible = Array.from(host.querySelectorAll<HTMLElement>('[role="option"]')).filter(
				(option) => !option.hidden,
			);
			expect(visible.map((option) => option.textContent)).toEqual(['Chair', 'Armchair']);
			cleanup();
		});

		it('stays closed while none of the arriving options matches the typed text', async () => {
			const { host, cleanup } = mount(<RuiCombobox options={[]} placeholder="Search" />);
			await settled();

			const input = host.querySelector('[data-combobox-input]') as HTMLInputElement;
			const popup = host.querySelector('[data-combobox-listbox]') as HTMLElement;

			await userEvent.type(input, 'chair');
			addOptions(host, ['Table']);
			await settled();
			expect(popup.hidden).toBe(true);

			addOptions(host, ['Chair']);
			await settled();
			expect(popup.hidden).toBe(false);
			cleanup();
		});

		it('keeps the listbox closed after the visitor dismissed it', async () => {
			const { host, cleanup } = mount(<RuiCombobox options={[]} placeholder="Search" />);
			await settled();

			const input = host.querySelector('[data-combobox-input]') as HTMLInputElement;
			const popup = host.querySelector('[data-combobox-listbox]') as HTMLElement;

			await userEvent.type(input, 'chair');
			addOptions(host, ['Chair']);
			await settled();
			expect(popup.hidden).toBe(false);

			await userEvent.keyboard('{Escape}');
			addOptions(host, ['Armchair']);
			await settled();

			expect(popup.hidden).toBe(true);
			cleanup();
		});

		it('keeps the listbox closed for options that arrive after a selection', async () => {
			const { host, cleanup } = mount(<RuiCombobox options={OPTIONS} placeholder="Search" />);
			await settled();

			const input = host.querySelector('[data-combobox-input]') as HTMLInputElement;
			const popup = host.querySelector('[data-combobox-listbox]') as HTMLElement;

			await userEvent.type(input, 'ita');
			await settled();
			expect(popup.hidden).toBe(false);
			await userEvent.click(host.querySelector('[role="option"][data-value="it"]') as HTMLElement);
			await settled();
			expect(popup.hidden).toBe(true);

			addOptions(host, ['Italian']);
			await settled();

			expect(popup.hidden).toBe(true);
			cleanup();
		});

		it('does not open for options added while the input is empty', async () => {
			const { host, cleanup } = mount(<RuiCombobox options={[]} placeholder="Search" />);
			await settled();

			const input = host.querySelector('[data-combobox-input]') as HTMLInputElement;
			const popup = host.querySelector('[data-combobox-listbox]') as HTMLElement;

			input.focus();
			addOptions(host, ['Chair']);
			await settled();

			expect(popup.hidden).toBe(true);
			cleanup();
		});

		it('does not open for options added while the input is not focused', async () => {
			const { host, cleanup } = mount(<RuiCombobox options={[]} placeholder="Search" />);
			await settled();

			const input = host.querySelector('[data-combobox-input]') as HTMLInputElement;
			const popup = host.querySelector('[data-combobox-listbox]') as HTMLElement;

			await userEvent.type(input, 'chair');
			input.blur();
			addOptions(host, ['Chair']);
			await settled();

			expect(popup.hidden).toBe(true);
			cleanup();
		});

		it('stays closed for a manual trigger kind', async () => {
			const { host, cleanup } = mount(<RuiCombobox options={[]} triggerKind="manual" placeholder="Search" />);
			await settled();

			const input = host.querySelector('[data-combobox-input]') as HTMLInputElement;
			const popup = host.querySelector('[data-combobox-listbox]') as HTMLElement;

			await userEvent.type(input, 'chair');
			addOptions(host, ['Chair']);
			await settled();

			expect(popup.hidden).toBe(true);
			cleanup();
		});

		it('re-evaluates the open state on refreshOptions()', async () => {
			const { host, cleanup } = mount(<RuiCombobox options={[]} placeholder="Search" />);
			await settled();

			const combobox = host.querySelector('rui-combobox') as RuiComboboxElement;
			const input = host.querySelector('[data-combobox-input]') as HTMLInputElement;
			const popup = host.querySelector('[data-combobox-listbox]') as HTMLElement;

			await userEvent.type(input, 'chair');
			addOptions(host, ['Chair']);
			combobox.refreshOptions();

			expect(popup.hidden).toBe(false);
			cleanup();
		});
	});

	describe('text typed before the script loads', () => {
		it('opens the filtered listbox for a focused input when the script loads after the visitor typed', async () => {
			const { host: source, cleanup: cleanupSource } = mount(
				<RuiCombobox options={[...OPTIONS, { value: 'oak', label: 'Oak table' }]} placeholder="Search" />,
			);
			await settled();
			const markup = (source.querySelector('rui-combobox') as RuiComboboxElement).innerHTML;
			cleanupSource();

			const tag = 'rui-combobox-late';
			const stage = document.createElement('div');
			document.body.append(stage);
			stage.innerHTML = `<${tag}>${markup}</${tag}>`;
			const input = stage.querySelector('[data-combobox-input]') as HTMLInputElement;
			input.focus();
			input.value = 'oak';
			expect(stage.querySelector(tag)).not.toBeInstanceOf(RuiComboboxElement);

			customElements.define(tag, class extends RuiComboboxElement {});
			await settled();

			const popup = stage.querySelector('[data-combobox-listbox]') as HTMLElement;
			expect(stage.querySelector(tag)).toBeInstanceOf(RuiComboboxElement);
			expect(stage.querySelector('[data-combobox-input]')).toBe(input);
			expect(document.activeElement).toBe(input);
			expect(input.value).toBe('oak');
			expect(popup.hidden).toBe(false);
			const visible = Array.from(stage.querySelectorAll<HTMLElement>('[role="option"]')).filter(
				(option) => !option.hidden,
			);
			expect(visible.map((option) => option.textContent?.trim())).toEqual(['Oak table']);
		});

		it('opens for suggestions that arrive after a late upgrade kept the typed text', async () => {
			const tag = 'rui-combobox-late-empty';
			const stage = document.createElement('div');
			document.body.append(stage);
			stage.innerHTML = `<${tag}><div data-ref="root"><input data-combobox-input /><div data-combobox-listbox hidden><rui-listbox embedded><div role="listbox"></div></rui-listbox></div></div></${tag}>`;
			const input = stage.querySelector('[data-combobox-input]') as HTMLInputElement;
			input.focus();
			input.value = 'chair';

			customElements.define(tag, class extends RuiComboboxElement {});
			await settled();
			const popup = stage.querySelector('[data-combobox-listbox]') as HTMLElement;
			expect(popup.hidden).toBe(true);

			const option = document.createElement('div');
			option.setAttribute('role', 'option');
			option.setAttribute('data-value', 'chair');
			option.textContent = 'Chair';
			(stage.querySelector('[role="listbox"]') as HTMLElement).append(option);
			await settled();

			expect(input.value).toBe('chair');
			expect(popup.hidden).toBe(false);
		});
	});
});
