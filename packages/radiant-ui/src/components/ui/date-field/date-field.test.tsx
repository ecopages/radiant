import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRoot } from '@ecopages/jsx';
import { RuiDateField } from './date-field';
import { RuiDateField as RuiDateFieldScript } from './date-field.script';
import { RuiDateInput as RuiDateInputScript } from '../date-input/date-input.script';
void RuiDateFieldScript;
void RuiDateInputScript;

async function settled(): Promise<void> {
	await customElements.whenDefined('rui-date-field');
	await customElements.whenDefined('rui-date-input');
	await customElements.whenDefined('rui-calendar');
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

function mount() {
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(
		<>
			<button type="button" id="elsewhere">
				Elsewhere
			</button>
			<RuiDateField value="2026-08-07" locale="en-US" label="Start" />
		</>,
	);
	return host;
}

describe('RuiDateField popup focus', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('returns focus to the toggle when Escape closes the popup', async () => {
		const host = mount();
		await settled();
		const toggle = host.querySelector('[data-date-field-trigger]') as HTMLButtonElement;
		const popover = host.querySelector('[data-date-field-popover]') as HTMLElement;

		await userEvent.click(toggle);
		await settled();
		await userEvent.keyboard('{ArrowDown}');
		expect(popover.hidden).toBe(false);

		await userEvent.keyboard('{Escape}');
		await settled();
		expect(popover.hidden).toBe(true);
		expect(document.activeElement).toBe(toggle);
	});

	it('leaves focus where an outside click put it', async () => {
		const host = mount();
		await settled();
		const toggle = host.querySelector('[data-date-field-trigger]') as HTMLButtonElement;
		const popover = host.querySelector('[data-date-field-popover]') as HTMLElement;
		const elsewhere = host.querySelector('#elsewhere') as HTMLButtonElement;

		await userEvent.click(toggle);
		await settled();
		expect(popover.hidden).toBe(false);

		await userEvent.click(elsewhere);
		await settled();
		expect(popover.hidden).toBe(true);
		expect(document.activeElement).toBe(elsewhere);
	});

	it('returns focus to the toggle after a day is selected', async () => {
		const host = mount();
		await settled();
		const toggle = host.querySelector('[data-date-field-trigger]') as HTMLButtonElement;
		const popover = host.querySelector('[data-date-field-popover]') as HTMLElement;

		await userEvent.click(toggle);
		await settled();
		const day = popover.querySelector(
			'[data-calendar-day]:not(:disabled):not([data-iso="2026-08-07"])',
		) as HTMLElement;
		day.click();
		await settled();
		expect(popover.hidden).toBe(true);
		expect(document.activeElement).toBe(toggle);
	});

	it('keeps focus in the segment input when Escape closes the popup', async () => {
		const host = mount();
		await settled();
		const toggle = host.querySelector('[data-date-field-trigger]') as HTMLButtonElement;
		const popover = host.querySelector('[data-date-field-popover]') as HTMLElement;
		const segment = host.querySelector(
			'[data-date-field-input] [contenteditable], [data-date-field-input] input, [data-date-field-input] [tabindex]',
		) as HTMLElement;

		await userEvent.click(toggle);
		await settled();
		segment.focus();
		await settled();
		const focusedSegment = document.activeElement;
		expect(host.querySelector('[data-date-field-input]')?.contains(focusedSegment)).toBe(true);
		(document.activeElement as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
		);
		await settled();
		expect(popover.hidden).toBe(true);
		expect(document.activeElement).toBe(focusedSegment);
	});
});
