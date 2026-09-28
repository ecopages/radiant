import { afterEach, describe, expect, it } from 'vitest';
import { createRoot } from '@ecopages/jsx';
import { typeIsoIntoDateInput } from '@sb/date-input-typing';
import { userEvent } from 'storybook/test';
import { RuiDateRangePicker } from './date-range-picker';
import './date-range-picker.script';
import '../date-input/date-input.script';
import '../date-input/date-input.css';

async function flushRender(): Promise<void> {
	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => resolve());
		});
	});
}

async function flushFirstConnect(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('RuiDateRangePicker draft range', () => {
	it('restores the parent value when the native form resets both date inputs', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		createRoot(host).render(
			<form>
				<RuiDateRangePicker value="2026-08-07/2026-08-14" startName="start" endName="end" />
			</form>,
		);
		await customElements.whenDefined('rui-date-range-picker');
		await customElements.whenDefined('rui-date-input');
		await flushFirstConnect();
		await flushRender();

		const picker = host.querySelector('rui-date-range-picker') as HTMLElement & { value: string };
		picker.value = '2026-09-01/2026-09-10';
		await flushRender();
		const form = host.querySelector('form')!;
		form.reset();
		await flushRender();

		expect(picker.value).toBe('2026-08-07/2026-08-14');
		expect(new FormData(form).get('start')).toBe('2026-08-07');
		expect(new FormData(form).get('end')).toBe('2026-08-14');
		host.remove();
	});

	it('keeps a completed start date while the end is still empty', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(<RuiDateRangePicker value="" locale="en-US" />);

		await customElements.whenDefined('rui-date-range-picker');
		await customElements.whenDefined('rui-date-input');
		await flushFirstConnect();

		const picker = host.querySelector('rui-date-range-picker') as HTMLElement;
		const start = host.querySelector('[data-range-start]') as HTMLElement & { value: string };
		const end = host.querySelector('[data-range-end]') as HTMLElement & { value: string };

		start.value = '2026-08-07';
		start.dispatchEvent(
			new CustomEvent('rui-change', { bubbles: true, composed: true, detail: { value: '2026-08-07' } }),
		);
		await flushRender();

		expect(start.value).toBe('2026-08-07');
		expect(picker.getAttribute('value') ?? '').toBe('');

		end.value = '2026-08-14';
		end.dispatchEvent(
			new CustomEvent('rui-change', { bubbles: true, composed: true, detail: { value: '2026-08-14' } }),
		);
		await flushRender();

		expect(picker.getAttribute('value')).toBe('2026-08-07/2026-08-14');
		expect(start.value).toBe('2026-08-07');
		expect(end.value).toBe('2026-08-14');

		host.remove();
	});

	it('clears the committed range without wiping a remaining draft side', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(<RuiDateRangePicker value="2026-08-07/2026-08-14" locale="en-US" />);

		await customElements.whenDefined('rui-date-range-picker');
		await customElements.whenDefined('rui-date-input');
		await flushFirstConnect();
		await flushRender();

		const picker = host.querySelector('rui-date-range-picker') as HTMLElement;
		const start = host.querySelector('[data-range-start]') as HTMLElement & { value: string };
		const end = host.querySelector('[data-range-end]') as HTMLElement & { value: string };

		end.value = '';
		end.dispatchEvent(new CustomEvent('rui-change', { bubbles: true, composed: true, detail: { value: '' } }));
		await flushRender();

		expect(picker.getAttribute('value') ?? '').toBe('');
		expect(start.value).toBe('2026-08-07');

		host.remove();
	});

	it('keeps typed start segments while the end is still empty', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(<RuiDateRangePicker value="" locale="en-US" />);

		await customElements.whenDefined('rui-date-range-picker');
		await customElements.whenDefined('rui-date-input');
		await flushFirstConnect();
		await flushRender();

		const picker = host.querySelector('rui-date-range-picker') as HTMLElement;
		const start = host.querySelector('[data-range-start]') as HTMLElement & { value: string };

		await typeIsoIntoDateInput(start, '2026-08-07');
		await userEvent.click(document.body);
		await flushRender();

		expect(start.querySelector('[data-date-segment][data-type="year"]')?.textContent).toBe('2026');
		expect(start.querySelector('[data-date-segment][data-placeholder="true"]')).toBeNull();
		expect(picker.getAttribute('value') ?? '').toBe('');
		expect(start.value).toBe('2026-08-07');
	});
});
