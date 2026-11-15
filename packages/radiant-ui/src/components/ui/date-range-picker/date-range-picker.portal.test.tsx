import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRoot } from '@ecopages/jsx';
import { RuiDateRangePicker } from './date-range-picker';
import { RuiDateRangePicker as RuiDateRangePickerScript } from './date-range-picker.script';
import { RuiDateInput as RuiDateInputScript } from '../date-input/date-input.script';
void RuiDateRangePickerScript;
void RuiDateInputScript;

async function settled(): Promise<void> {
	await customElements.whenDefined('rui-date-range-picker');
	await customElements.whenDefined('rui-date-input');
	await customElements.whenDefined('rui-calendar');
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

async function mountField(portal: boolean) {
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(
		<>
			<button type="button" id="elsewhere">
				Elsewhere
			</button>
			<div id="frame" />
			<RuiDateRangePicker value="2026-08-01/2026-08-14" locale="en-US" portal={portal} />
		</>,
	);
	await settled();
	const picker = host.querySelector('rui-date-range-picker') as RuiDateRangePickerScript;
	return {
		host,
		picker,
		toggle: picker.querySelector('[data-range-trigger]') as HTMLButtonElement,
		popup: picker.querySelector('[data-range-popover]') as HTMLElement,
		frame: host.querySelector('#frame') as HTMLElement,
		elsewhere: host.querySelector('#elsewhere') as HTMLButtonElement,
	};
}

describe.each([false, true])('RuiDateRangePicker with portal %s', (portal) => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('opens with the popup inside the field only when it is not portaled', async () => {
		const { picker, toggle, popup } = await mountField(portal);

		toggle.click();
		await settled();

		expect(popup.hidden).toBe(false);
		expect(picker.contains(popup)).toBe(!portal);
		expect(popup.parentElement === document.body).toBe(portal);
	});

	it('commits the range a user picks, closes and returns focus to the toggle', async () => {
		const { picker, toggle, popup } = await mountField(portal);
		const changes: string[] = [];
		picker.addEventListener('rui-change', (event) => {
			if (event.target === picker) changes.push((event as CustomEvent).detail.value);
		});

		toggle.click();
		await settled();
		await userEvent.click(popup.querySelector('[data-calendar-day][data-iso="2026-08-05"]') as HTMLElement);
		await userEvent.click(popup.querySelector('[data-calendar-day][data-iso="2026-08-12"]') as HTMLElement);
		await settled();

		expect(picker.value).toBe('2026-08-05/2026-08-12');
		expect(changes).toEqual(['2026-08-05/2026-08-12']);
		expect(popup.hidden).toBe(true);
		expect(document.activeElement).toBe(toggle);
	});

	it('hands value, min and max changes to the calendar while it is open', async () => {
		const { picker, toggle, popup } = await mountField(portal);

		toggle.click();
		await settled();
		picker.value = '2026-09-03/2026-09-10';
		picker.min = '2026-09-01';
		picker.max = '2026-09-30';
		await settled();

		const calendar = popup.querySelector('[data-range-calendar]') as HTMLElement;
		expect(calendar.getAttribute('value')).toBe('2026-09-03/2026-09-10');
		expect(calendar.getAttribute('min')).toBe('2026-09-01');
		expect(calendar.getAttribute('max')).toBe('2026-09-30');
	});

	it('closes on Escape and on focus moving away', async () => {
		const { toggle, popup, elsewhere } = await mountField(portal);

		toggle.click();
		await settled();
		popup.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
		await settled();
		expect(popup.hidden).toBe(true);

		toggle.click();
		await settled();
		elsewhere.focus();
		await settled();
		expect(popup.hidden).toBe(true);
	});
});

describe('RuiDateRangePicker portal container', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('puts the popup in the element a selector names and returns it on close', async () => {
		const { picker, toggle, popup, frame } = await mountField(true);
		picker.setAttribute('portal-container', '#frame');

		toggle.click();
		await settled();
		expect(popup.parentElement).toBe(frame);

		toggle.click();
		await settled();
		expect(picker.contains(popup)).toBe(true);
	});

	it('honors a container property changed between opens', async () => {
		const { picker, toggle, popup, frame } = await mountField(true);
		const other = document.createElement('div');
		document.body.append(other);

		picker.portalContainer = frame;
		toggle.click();
		await settled();
		expect(popup.parentElement).toBe(frame);
		toggle.click();
		await settled();

		picker.portalContainer = () => other;
		toggle.click();
		await settled();
		expect(popup.parentElement).toBe(other);
	});
});
