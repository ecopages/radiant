import type { JsxRenderable } from '@ecopages/jsx';
import type { Decorator, Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expectControlInputFontSize, expectFitsHorizontally, expectWithinViewport } from '@sb/layout-assertions';
import { calendarDayButton, monthDayIso } from '@sb/calendar-dates';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { RuiField, RuiFieldError } from '../field';
import { RuiForm } from '../form';
import { RuiLabel } from '../label';
import { RuiButton } from '../button';
import {
	RuiDateRangePicker,
	RuiDateRangePickerCalendar,
	RuiDateRangePickerControl,
	RuiDateRangePickerEndInput,
	RuiDateRangePickerInputs,
	RuiDateRangePickerPopover,
	RuiDateRangePickerSeparator,
	RuiDateRangePickerStartInput,
	RuiDateRangePickerToggle,
} from './date-range-picker';
import { RuiDateRangePicker as RuiDateRangePickerElement } from './date-range-picker.script';

const meta = {
	title: 'Components/DateRangePicker',
	component: RuiDateRangePicker,
	parameters: {
		radiant: {
			element: RuiDateRangePickerElement,
			cssImports: [
				'../../../styles/primitives.css',
				'../calendar/calendar.css',
				'../date-input/date-input.css',
				'../label/label.css',
				'./date-range-picker.css',
			],
		},
	},
	args: {
		value: `${monthDayIso(5)}/${monthDayIso(20)}`,
		locale: 'en-US',
	},
} satisfies Meta<typeof RuiDateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const narrowViewport =
	(width: number): Decorator =>
	(Story) => <div style={{ width: `${width}px`, maxWidth: '100%' }}>{Story() as JsxRenderable}</div>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-date-range-picker') as HTMLElement;

		await step('shows segment values for the committed range', async () => {
			await expect(host).toHaveAttribute('value', `${monthDayIso(5)}/${monthDayIso(20)}`);
			const start = canvasElement.querySelector('[data-range-start]') as HTMLElement;
			await expect(
				start.querySelector('[data-date-segment][data-type="day"]')?.textContent?.length,
			).toBeGreaterThan(0);
		});
	},
};

const typeIsoIntoDateInput = async (input: HTMLElement, iso: string): Promise<void> => {
	const [year, month, day] = iso.split('-');
	const monthSegment = input.querySelector('[data-date-segment][data-type="month"]') as HTMLElement;
	const daySegment = input.querySelector('[data-date-segment][data-type="day"]') as HTMLElement;
	const yearSegment = input.querySelector('[data-date-segment][data-type="year"]') as HTMLElement;
	await userEvent.click(monthSegment);
	await userEvent.keyboard(month ?? '');
	await userEvent.click(daySegment);
	await userEvent.keyboard(day ?? '');
	await userEvent.click(yearSegment);
	await userEvent.keyboard(year ?? '');
};

export const SegmentTyping: Story = {
	args: {
		value: '',
	},
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-date-range-picker') as HTMLElement;
		const start = canvasElement.querySelector('[data-range-start]') as HTMLElement;
		const end = canvasElement.querySelector('[data-range-end]') as HTMLElement;
		const startIso = '2026-08-07';
		const endIso = '2026-08-14';

		await step('keeps a completed start date while the end is still empty', async () => {
			await typeIsoIntoDateInput(start, startIso);
			await userEvent.click(document.body);
			await waitFor(() => {
				expect(start.querySelector('[data-date-segment][data-type="year"]')?.textContent).toBe('2026');
			});
			await expect(start.querySelector('[data-date-segment][data-placeholder="true"]')).toBeNull();
			await expect(host.getAttribute('value') ?? '').toBe('');
		});

		await step('commits the host value once both sides are complete', async () => {
			await typeIsoIntoDateInput(end, endIso);
			await userEvent.click(document.body);
			await waitFor(() => {
				expect(host.getAttribute('value')).toBe(`${startIso}/${endIso}`);
			});
		});
	},
};

export const WithCalendar: Story = {
	args: {
		value: '',
	},
	render: () => (
		<RuiDateRangePicker>
			<RuiDateRangePickerControl>
				<RuiDateRangePickerInputs>
					<RuiDateRangePickerStartInput aria-label="Start date" />
					<RuiDateRangePickerSeparator />
					<RuiDateRangePickerEndInput aria-label="End date" />
				</RuiDateRangePickerInputs>
				<RuiDateRangePickerToggle />
			</RuiDateRangePickerControl>
			<RuiDateRangePickerPopover>
				<RuiDateRangePickerCalendar />
			</RuiDateRangePickerPopover>
		</RuiDateRangePicker>
	),
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-date-range-picker') as HTMLElement;
		const trigger = canvasElement.querySelector('[data-range-trigger]') as HTMLButtonElement;

		await step('opens the range calendar and selects dates', async () => {
			await userEvent.click(trigger);
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			await waitFor(() => {
				expect(document.activeElement?.matches('[data-calendar-day]')).toBe(true);
			});
			const rangeStart = monthDayIso(3);
			const rangeEnd = monthDayIso(14);
			await userEvent.click(calendarDayButton(canvasElement, rangeStart));
			await userEvent.click(calendarDayButton(canvasElement, rangeEnd));
			await waitFor(() => {
				expect(host.getAttribute('value')).toBe(`${rangeStart}/${rangeEnd}`);
			});
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});
	},
};

/** Layout regression for nested start/end inputs at a 320px-wide container. */
export const NarrowLayout: Story = {
	decorators: [narrowViewport(320)],
	args: {
		value: `${monthDayIso(5)}/${monthDayIso(20)}`,
	},
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-date-range-picker') as HTMLElement;
		const group = host.querySelector('[data-ref="control"]') as HTMLElement;
		const start = host.querySelector('[data-range-start] [data-ref="root"]') as HTMLElement;
		const end = host.querySelector('[data-range-end] [data-ref="root"]') as HTMLElement;

		await step('fits the narrow container without horizontal overflow', async () => {
			expectFitsHorizontally(group);
			expectControlInputFontSize(start);
			expectControlInputFontSize(end);
		});
	},
};

export const NarrowLayoutLongValues: Story = {
	decorators: [narrowViewport(320)],
	args: {
		value: `${monthDayIso(1)}/${monthDayIso(28)}`,
		locale: 'en-US',
	},
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-date-range-picker') as HTMLElement;
		const group = host.querySelector('[data-ref="control"]') as HTMLElement;

		await step('segment rows still fit at narrow widths', async () => {
			expectFitsHorizontally(group);
		});
	},
};

export const NarrowLayoutCalendarOpen: Story = {
	decorators: [narrowViewport(320)],
	args: {
		value: '',
	},
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-date-range-picker') as HTMLElement;
		const trigger = host.querySelector('[data-range-trigger]') as HTMLButtonElement;

		await step('calendar popover stays inside the viewport', async () => {
			await userEvent.click(trigger);
			await waitFor(() => {
				expect(trigger).toHaveAttribute('aria-expanded', 'true');
			});
			const popover = host.querySelector('[data-range-popover]') as HTMLElement;
			expectWithinViewport(popover);
			expectFitsHorizontally(popover);

			const widthBefore = popover.getBoundingClientRect().width;
			const prevLeft = host.querySelector('[data-calendar-prev-month]')?.getBoundingClientRect().left;
			const nextMonth = host.querySelector('[data-calendar-next-month]') as HTMLButtonElement;
			await userEvent.click(nextMonth);
			await waitFor(() => {
				expect(popover.getBoundingClientRect().width).toBeCloseTo(widthBefore, 0);
			});
			if (prevLeft !== undefined) {
				expect(host.querySelector('[data-calendar-prev-month]')?.getBoundingClientRect().left).toBeCloseTo(
					prevLeft,
					0,
				);
			}
		});
	},
};

export const AsField: Story = {
	render: () => (
		<RuiForm defaultValues={{ trip: '' }} mode="onSubmit">
			<RuiField name="trip" rules={{ required: 'Pick trip dates' }}>
				<RuiLabel>Trip dates</RuiLabel>
				<RuiDateRangePicker locale="en-US" />
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Book</RuiButton>
		</RuiForm>
	),
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);

		await step('required validation works in a form', async () => {
			await userEvent.click(canvas.getByRole('button', { name: 'Book' }));
			await waitFor(async () => {
				await expect(canvas.getByText('Pick trip dates')).toBeVisible();
			});
		});
	},
};
