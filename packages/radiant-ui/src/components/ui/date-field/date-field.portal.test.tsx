import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRoot } from '@ecopages/jsx';
import { RuiDateField } from './date-field';
import { RuiDateField as RuiDateFieldScript } from './date-field.script';
import { RuiDateInput as RuiDateInputScript } from '../date-input/date-input.script';
import { expectPopupFoundAcrossPortalCycle } from '../../../controllers/exit-transition.fixture';
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

async function mountField(portal: boolean) {
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(
		<>
			<button type="button" id="elsewhere">
				Elsewhere
			</button>
			<div id="frame" />
			<RuiDateField value="2026-08-07" locale="en-US" label="Start" portal={portal} />
		</>,
	);
	await settled();
	const field = host.querySelector('rui-date-field') as RuiDateFieldScript;
	return {
		host,
		field,
		toggle: field.querySelector('[data-date-field-trigger]') as HTMLButtonElement,
		popup: field.querySelector('[data-date-field-popover]') as HTMLElement,
		frame: host.querySelector('#frame') as HTMLElement,
		elsewhere: host.querySelector('#elsewhere') as HTMLButtonElement,
	};
}

describe.each([false, true])('RuiDateField with portal %s', (portal) => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('opens with the popup inside the field only when it is not portaled', async () => {
		const { field, toggle, popup } = await mountField(portal);

		toggle.click();
		await settled();

		expect(popup.hidden).toBe(false);
		expect(field.contains(popup)).toBe(!portal);
		expect(popup.parentElement === document.body).toBe(portal);
	});

	it('commits the day a user picks, closes and returns focus to the toggle', async () => {
		const { field, toggle, popup } = await mountField(portal);
		const changes: string[] = [];
		field.addEventListener('change', (event) => {
			if (event.target === field) changes.push(field.value);
		});

		toggle.click();
		await settled();
		await userEvent.click(popup.querySelector('[data-calendar-day][data-iso="2026-08-12"]') as HTMLElement);
		await settled();

		expect(field.value).toBe('2026-08-12');
		expect(changes).toEqual(['2026-08-12']);
		expect(popup.hidden).toBe(true);
		expect(document.activeElement).toBe(toggle);
	});

	it('hands value, min and max changes to the calendar while it is open', async () => {
		const { field, toggle, popup } = await mountField(portal);

		toggle.click();
		await settled();
		field.value = '2026-09-03';
		field.min = '2026-09-01';
		field.max = '2026-09-30';
		await settled();

		const calendar = popup.querySelector('[data-date-field-calendar]') as HTMLElement;
		expect(calendar.getAttribute('value')).toBe('2026-09-03');
		expect(calendar.getAttribute('min')).toBe('2026-09-01');
		expect(calendar.getAttribute('max')).toBe('2026-09-30');
	});

	it('keeps the label on the input and closes on Escape and on focus moving away', async () => {
		const { field, toggle, popup, elsewhere } = await mountField(portal);
		const input = field.querySelector('[data-date-field-input]') as HTMLElement;
		expect(input.getAttribute('aria-label')).toBe('Start');
		expect(input.hasAttribute('aria-labelledby')).toBe(false);

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

describe('RuiDateField portal container', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('puts the popup in the element a selector names and returns it on close', async () => {
		const { field, toggle, popup, frame } = await mountField(true);
		field.setAttribute('portal-container', '#frame');

		toggle.click();
		await settled();
		expect(popup.parentElement).toBe(frame);

		toggle.click();
		await settled();
		expect(field.contains(popup)).toBe(true);
	});

	it('honors a container property changed between opens', async () => {
		const { field, toggle, popup, frame } = await mountField(true);
		const other = document.createElement('div');
		document.body.append(other);

		field.portalContainer = frame;
		toggle.click();
		await settled();
		expect(popup.parentElement).toBe(frame);
		toggle.click();
		await settled();

		field.portalContainer = () => other;
		toggle.click();
		await settled();
		expect(popup.parentElement).toBe(other);
	});
});

describe('RuiDateField reads its portaled popup from the popover controller', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('finds the current popup while open, during its exit, and after a reopen with a new node', async () => {
		const { field, toggle, popup } = await mountField(true);

		await expectPopupFoundAcrossPortalCycle({
			popup,
			portaled: true,
			find: () => Reflect.get(field, 'popoverTarget'),
			open: async () => {
				toggle.click();
				await settled();
			},
			close: async () => {
				const current = Reflect.get(field, 'popoverTarget') as HTMLElement;
				current.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
				await settled();
			},
		});
	});
});
