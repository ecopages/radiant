import { createRoot } from '@ecopages/jsx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { RuiCalendar } from './index';

const START = '2030-05-05';
const END = '2030-05-09';

function dayButton(container: HTMLElement, iso: string): HTMLButtonElement {
	const button = container.querySelector<HTMLButtonElement>(`[data-calendar-day][data-iso="${iso}"]`);
	if (!button) throw new Error(`No day button for ${iso}`);
	return button;
}

function previewedDays(container: HTMLElement): string[] {
	return Array.from(container.querySelectorAll<HTMLElement>('[data-calendar-day][data-range-middle]')).map(
		(day) => day.getAttribute('data-iso') ?? '',
	);
}

async function mountRangeCalendar(): Promise<HTMLElement> {
	const container = document.createElement('div');
	document.body.append(container);
	createRoot(container).render(<RuiCalendar selectionMode="range" value={`${START}/${START}`} />);
	await vi.waitFor(() => expect(container.querySelector('[data-calendar-day]')).toBeTruthy());
	return container;
}

describe('RuiCalendar range hover preview', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('marks the days between the start and the hovered day as the preview range', async () => {
		const container = await mountRangeCalendar();

		await userEvent.click(dayButton(container, START));
		await userEvent.hover(dayButton(container, END));

		await vi.waitFor(() => expect(previewedDays(container)).toHaveLength(3));
		expect(previewedDays(container)).toEqual(['2030-05-06', '2030-05-07', '2030-05-08']);
	});

	it('clears the preview when the pointer leaves the day grid', async () => {
		const container = await mountRangeCalendar();

		await userEvent.click(dayButton(container, START));
		await userEvent.hover(dayButton(container, END));
		await vi.waitFor(() => expect(previewedDays(container).length).toBeGreaterThan(0));

		await userEvent.hover(document.body);

		await vi.waitFor(() => expect(previewedDays(container)).toEqual([]));
	});

	it('keeps the hovered and focused day cells in the document while previewing', async () => {
		const container = await mountRangeCalendar();

		await userEvent.click(dayButton(container, START));
		const focused = dayButton(container, START);
		focused.focus();
		const hovered = dayButton(container, END);
		await userEvent.hover(hovered);
		await vi.waitFor(() => expect(previewedDays(container).length).toBeGreaterThan(0));

		expect(hovered.isConnected).toBe(true);
		expect(document.activeElement).toBe(focused);
	});

	it('commits the range when the hovered day is pressed', async () => {
		const container = await mountRangeCalendar();
		const host = container.querySelector('rui-calendar') as HTMLElement;

		await userEvent.click(dayButton(container, START));
		const end = dayButton(container, END);
		await userEvent.hover(end);
		end.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		end.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
		end.click();

		await vi.waitFor(() => expect(host.getAttribute('value')).toBe(`${START}/${END}`));
	});
});
