import { afterEach, describe, expect, it } from 'vitest';
import { createRoot } from '@ecopages/jsx';
import { RuiSelect } from './select';
import { RuiSelect as RuiSelectElement } from './select.script';
void RuiSelectElement;

const OPTIONS = [
	{ value: 'cat', label: 'Cat' },
	{ value: 'dog', label: 'Dog' },
];

async function settled(): Promise<void> {
	await customElements.whenDefined('rui-select');
	await customElements.whenDefined('rui-listbox');
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

function press(target: HTMLElement, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

async function mountSelect(portal: boolean, extra: { selectionMode?: 'multiple' } = {}) {
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(
		<>
			<div id="frame" />
			<RuiSelect options={OPTIONS} label="Pets" portal={portal} {...extra} />
		</>,
	);
	await settled();
	const select = host.querySelector('rui-select') as RuiSelectElement;
	return {
		host,
		select,
		trigger: select.querySelector('[data-select-trigger]') as HTMLElement,
		popup: select.querySelector('[data-select-listbox]') as HTMLElement,
		frame: host.querySelector('#frame') as HTMLElement,
	};
}

describe.each([false, true])('RuiSelect with portal %s', (portal) => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('opens with the popup inside the select only when it is not portaled', async () => {
		const { select, trigger, popup } = await mountSelect(portal);

		trigger.click();
		await settled();

		expect(popup.hidden).toBe(false);
		expect(select.contains(popup)).toBe(!portal);
		expect(popup.parentElement === document.body).toBe(portal);
	});

	it('selects an option by click, keeps the value and label wiring, and closes', async () => {
		const { select, trigger, popup } = await mountSelect(portal);
		const changes: string[][] = [];
		select.addEventListener('rui-change', (event) => changes.push((event as CustomEvent).detail.value));

		trigger.click();
		await settled();
		(popup.querySelector('[role="option"][data-value="dog"]') as HTMLElement).click();
		await settled();

		expect(select.value).toEqual(['dog']);
		expect(changes).toEqual([['dog']]);
		expect(popup.hidden).toBe(true);
		expect(select.contains(popup)).toBe(true);
		const listbox = popup.querySelector('[role="listbox"]') as HTMLElement;
		expect(trigger.getAttribute('aria-controls')).toBe(listbox.id);
		expect(listbox.getAttribute('aria-label')).toBe('Pets');
		expect(popup.querySelector('[data-value="dog"]')?.getAttribute('aria-selected')).toBe('true');
		expect(popup.querySelector('[data-value="cat"]')?.getAttribute('aria-selected')).toBe('false');
	});

	it('moves the active option with the arrow keys and selects it with Enter', async () => {
		const { select, trigger, popup } = await mountSelect(portal);

		press(trigger, 'ArrowDown');
		await settled();
		press(trigger, 'ArrowDown');
		press(trigger, 'Enter');
		await settled();

		expect(select.value).toEqual(['dog']);
		expect(popup.hidden).toBe(true);
	});

	it('closes on Escape and on Tab away', async () => {
		const { trigger, popup } = await mountSelect(portal);

		trigger.click();
		await settled();
		press(trigger, 'Escape');
		await settled();
		expect(popup.hidden).toBe(true);
		expect(document.activeElement).toBe(trigger);

		trigger.click();
		await settled();
		press(trigger, 'Tab');
		await settled();
		expect(popup.hidden).toBe(true);
	});

	it('closes on a press outside the select and the popup', async () => {
		const { trigger, popup } = await mountSelect(portal);

		trigger.click();
		await settled();
		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		await settled();

		expect(popup.hidden).toBe(true);
	});

	it('toggles values in multiple mode and keeps the popup open', async () => {
		const { select, trigger, popup } = await mountSelect(portal, { selectionMode: 'multiple' });

		trigger.click();
		await settled();
		(popup.querySelector('[data-value="cat"]') as HTMLElement).click();
		(popup.querySelector('[data-value="dog"]') as HTMLElement).click();
		await settled();

		const listboxHost = popup.querySelector('rui-listbox') as HTMLElement & {
			selectionMode: string;
			value: string[];
		};
		expect(select.value).toEqual(['cat', 'dog']);
		expect(listboxHost.selectionMode).toBe('multiple');
		expect(listboxHost.value).toEqual(['cat', 'dog']);
		expect(popup.hidden).toBe(false);
		expect(popup.querySelector('[role="listbox"]')?.getAttribute('aria-multiselectable')).toBe('true');
	});
});

describe('RuiSelect portal container', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('puts the popup in the element a selector names and returns it on close', async () => {
		const { select, trigger, popup, frame } = await mountSelect(true);
		select.setAttribute('portal-container', '#frame');

		trigger.click();
		await settled();
		expect(popup.parentElement).toBe(frame);

		press(trigger, 'Escape');
		await settled();
		expect(select.contains(popup)).toBe(true);
	});

	it('honors a container property changed between opens, as an element or a function', async () => {
		const { select, trigger, popup, frame } = await mountSelect(true);
		const other = document.createElement('div');
		document.body.append(other);

		select.portalContainer = frame;
		trigger.click();
		await settled();
		expect(popup.parentElement).toBe(frame);
		press(trigger, 'Escape');
		await settled();

		select.portalContainer = () => other;
		trigger.click();
		await settled();
		expect(popup.parentElement).toBe(other);
	});

	it('finds a container that is added after the select connects', async () => {
		const { select, trigger, popup } = await mountSelect(true);
		select.setAttribute('portal-container', '#late');
		const late = document.createElement('div');
		late.id = 'late';
		document.body.append(late);

		trigger.click();
		await settled();

		expect(popup.parentElement).toBe(late);
	});

	it('keeps the popup beside the trigger without portal even when a container is set', async () => {
		const { select, trigger, popup, frame } = await mountSelect(false);
		select.portalContainer = frame;

		trigger.click();
		await settled();

		expect(select.contains(popup)).toBe(true);
	});
});
