import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import {
	addDaysIso,
	addMonthsIso,
	calendarDayButton,
	endOfMonthIso,
	monthDayIso,
	todayIso,
} from '@sb/calendar-dates';
import { expect, userEvent, waitFor } from 'storybook/test';
import { RuiCalendar } from './calendar';
import { RuiCalendar as RuiCalendarElement } from './calendar.script';

const today = todayIso();
const clickDay = monthDayIso(15) === today ? monthDayIso(16) : monthDayIso(15);
const rangeStart = monthDayIso(5);
const rangeEnd = monthDayIso(20);
const multipleSecond = monthDayIso(12);
const monthEnd = endOfMonthIso();
const dayBeforeMonthEnd = addDaysIso(monthEnd, -1);
const nextMonthStart = addDaysIso(monthEnd, 1);
const pageDownTarget = addMonthsIso(nextMonthStart, 1);
const currentYear = String(new Date().getFullYear());

const meta = {
	title: 'Components/Calendar',
	component: RuiCalendar,
	parameters: { radiant: { element: RuiCalendarElement, cssImports: ['./calendar.css'] } },
	args: {
		value: today,
	},
} satisfies Meta<typeof RuiCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-calendar') as HTMLElement;

		await step('renders the selected month', async () => {
			await expect(host).toHaveAttribute('value', today);
			await expect(canvasElement).toHaveTextContent(new RegExp(currentYear));
		});

		await step('selecting a day updates value', async () => {
			await userEvent.click(calendarDayButton(canvasElement, clickDay));
			await expect(host).toHaveAttribute('value', clickDay);
		});
	},
};

export const WithMinMax: Story = {
	args: {
		value: monthDayIso(10),
		min: monthDayIso(5),
		max: monthDayIso(20),
	},
	play: async ({ canvasElement, step }) => {
		await step('disables days outside range', async () => {
			const disabled = canvasElement.querySelectorAll('[data-calendar-day]:disabled');
			await expect(disabled.length).toBeGreaterThan(0);
		});
	},
};

export const KeyboardNavigation: Story = {
	args: {
		value: monthEnd,
	},
	play: async ({ canvasElement, step }) => {
		const selectedDay = calendarDayButton(canvasElement, monthEnd);

		await step('arrow navigation moves focus across a month boundary', async () => {
			selectedDay.focus();
			await userEvent.keyboard('{ArrowLeft}');
			await expect(selectedDay.isConnected).toBe(true);
			await expect(selectedDay).toHaveAttribute('tabindex', '-1');
			await expect(document.activeElement).toHaveAttribute('data-iso', dayBeforeMonthEnd);
			await userEvent.keyboard('{ArrowRight}');
			await expect(document.activeElement).toBe(selectedDay);
			await userEvent.keyboard('{ArrowRight}');
			await waitFor(() => {
				expect(document.activeElement).toHaveAttribute('data-iso', nextMonthStart);
			});
		});

		await step('PageDown preserves the focused day in the next month', async () => {
			await userEvent.keyboard('{PageDown}');
			await waitFor(() => {
				expect(document.activeElement).toHaveAttribute('data-iso', pageDownTarget);
			});
		});
	},
};

export const RangeSelection: Story = {
	args: {
		value: '',
		selectionMode: 'range',
	},
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-calendar') as HTMLElement;

		await step('selects a start and end date', async () => {
			await userEvent.click(calendarDayButton(canvasElement, rangeStart));
			await userEvent.click(calendarDayButton(canvasElement, rangeEnd));
			await expect(host).toHaveAttribute('value', `${rangeStart}/${rangeEnd}`);
		});
	},
};

export const MultipleSelection: Story = {
	args: {
		value: '',
		selectionMode: 'multiple',
	},
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-calendar') as HTMLElement;

		await step('toggles multiple days', async () => {
			await userEvent.click(calendarDayButton(canvasElement, rangeStart));
			await userEvent.click(calendarDayButton(canvasElement, multipleSecond));
			await expect(host).toHaveAttribute('value', `${rangeStart},${multipleSecond}`);
		});
	},
};

export const TwoMonths: Story = {
	args: {
		value: today,
		visibleMonths: 2,
	},
	play: async ({ canvasElement, step }) => {
		await step('renders two month panels', async () => {
			await expect(canvasElement.querySelectorAll('[data-calendar-month-panel]').length).toBe(2);
		});
	},
};

export const RangeTwoMonths: Story = {
	args: {
		value: `${monthDayIso(2)}/${addMonthsIso(monthDayIso(15), 1)}`,
		selectionMode: 'range',
		visibleMonths: 2,
	},
};
