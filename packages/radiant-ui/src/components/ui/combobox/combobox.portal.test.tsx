import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRoot } from '@ecopages/jsx';
import { RuiCombobox } from './combobox';
import { RuiCombobox as RuiComboboxElement } from './combobox.script';
void RuiComboboxElement;

const OPTIONS = [
	{ value: 'de', label: 'Germany' },
	{ value: 'it', label: 'Italy' },
];

async function settled(): Promise<void> {
	await customElements.whenDefined('rui-combobox');
	await customElements.whenDefined('rui-listbox');
	await customElements.whenDefined('rui-autocomplete');
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

function press(target: HTMLElement, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

async function mountCombobox(portal: boolean) {
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(
		<>
			<div id="frame" />
			<RuiCombobox options={OPTIONS} label="Country" portal={portal} />
		</>,
	);
	await settled();
	const combobox = host.querySelector('rui-combobox') as RuiComboboxElement;
	return {
		host,
		combobox,
		input: combobox.querySelector('[data-combobox-input]') as HTMLInputElement,
		trigger: combobox.querySelector('[data-combobox-trigger]') as HTMLButtonElement,
		popup: combobox.querySelector('[data-combobox-listbox]') as HTMLElement,
		frame: host.querySelector('#frame') as HTMLElement,
	};
}

function type(input: HTMLInputElement, text: string): void {
	input.value = text;
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe.each([false, true])('RuiCombobox with portal %s', (portal) => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('opens with the popup inside the combobox only when it is not portaled', async () => {
		const { combobox, trigger, popup } = await mountCombobox(portal);

		trigger.click();
		await settled();

		expect(popup.hidden).toBe(false);
		expect(combobox.contains(popup)).toBe(!portal);
		expect(popup.parentElement === document.body).toBe(portal);
	});

	it('selects an option by click, fills the input and keeps the label and aria wiring', async () => {
		const { combobox, input, trigger, popup } = await mountCombobox(portal);
		const changes: string[][] = [];
		combobox.addEventListener('rui-change', (event) => changes.push((event as CustomEvent).detail.value));

		trigger.click();
		await settled();
		await userEvent.click(popup.querySelector('[data-value="it"]') as HTMLElement);
		await settled();

		const listboxHost = popup.querySelector('rui-listbox') as HTMLElement & { value: string[] };
		expect(combobox.value).toEqual(['it']);
		expect(listboxHost.value).toEqual(['it']);
		expect(changes).toEqual([['it']]);
		expect(input.value).toBe('Italy');
		expect(popup.hidden).toBe(true);
		const listbox = popup.querySelector('[role="listbox"]') as HTMLElement;
		expect(input.getAttribute('aria-controls')).toBe(listbox.id);
		expect(trigger.getAttribute('aria-controls')).toBe(listbox.id);
		expect(listbox.getAttribute('aria-label')).toBe('Country');
		expect(popup.querySelector('[data-value="it"]')?.getAttribute('aria-selected')).toBe('true');
	});

	it('filters the options as the user types', async () => {
		const { input, popup } = await mountCombobox(portal);

		type(input, 'ita');
		await settled();

		expect(popup.hidden).toBe(false);
		expect((popup.querySelector('[data-value="de"]') as HTMLElement).hidden).toBe(true);
		expect((popup.querySelector('[data-value="it"]') as HTMLElement).hidden).toBe(false);
	});

	it('moves the active option with the arrow keys and selects it with Enter', async () => {
		const { combobox, input, popup } = await mountCombobox(portal);

		press(input, 'ArrowDown');
		await settled();
		press(input, 'ArrowDown');
		press(input, 'Enter');
		await settled();

		expect(combobox.value).toEqual(['it']);
		expect(popup.hidden).toBe(true);
	});

	it('closes on Escape and on a press outside', async () => {
		const { trigger, input, popup } = await mountCombobox(portal);

		trigger.click();
		await settled();
		press(input, 'Escape');
		await settled();
		expect(popup.hidden).toBe(true);

		trigger.click();
		await settled();
		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		await settled();
		expect(popup.hidden).toBe(true);
	});

	it('closes on Tab away', async () => {
		const { trigger, input, popup } = await mountCombobox(portal);

		trigger.click();
		await settled();
		press(input, 'Tab');
		await settled();

		expect(popup.hidden).toBe(true);
	});
});

describe('RuiCombobox portal container', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('puts the popup in the element a selector names and returns it on close', async () => {
		const { combobox, trigger, input, popup, frame } = await mountCombobox(true);
		combobox.setAttribute('portal-container', '#frame');

		trigger.click();
		await settled();
		expect(popup.parentElement).toBe(frame);

		press(input, 'Escape');
		await settled();
		expect(combobox.contains(popup)).toBe(true);
	});

	it('honors a container property changed between opens', async () => {
		const { combobox, trigger, input, popup, frame } = await mountCombobox(true);
		const other = document.createElement('div');
		document.body.append(other);

		combobox.portalContainer = frame;
		trigger.click();
		await settled();
		expect(popup.parentElement).toBe(frame);
		press(input, 'Escape');
		await settled();

		combobox.portalContainer = () => other;
		trigger.click();
		await settled();
		expect(popup.parentElement).toBe(other);
	});
});
