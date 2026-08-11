import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { RuiCalendar } from './calendar';
import { RuiCalendar as RuiCalendarElement } from './calendar.script';

const meta = {
	title: 'Components/Calendar',
	component: RuiCalendar,
	parameters: { radiant: { element: RuiCalendarElement, cssImports: ['./calendar.css'] } },
	args: {
		value: '2026-08-02',
	},
} satisfies Meta<typeof RuiCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-calendar') as HTMLElement;

		await step('renders the selected month', async () => {
			await expect(host).toHaveAttribute('value', '2026-08-02');
			await expect(canvasElement).toHaveTextContent(/2026/);
		});

		await step('selecting a day updates value', async () => {
			const day = canvasElement.querySelector('[data-calendar-day][data-iso="2026-08-15"]') as HTMLButtonElement;
			await userEvent.click(day);
			await expect(host).toHaveAttribute('value', '2026-08-15');
		});
	},
};

export const WithMinMax: Story = {
	args: {
		value: '2026-08-02',
		min: '2026-08-01',
		max: '2026-08-31',
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
		value: '2026-08-31',
	},
	play: async ({ canvasElement, step }) => {
		const selectedDay = canvasElement.querySelector('[data-calendar-day][data-iso="2026-08-31"]') as HTMLButtonElement;

		await step('arrow navigation moves focus across a month boundary', async () => {
			selectedDay.focus();
			await userEvent.keyboard('{ArrowLeft}');
			await expect(selectedDay.isConnected).toBe(true);
			await expect(selectedDay).toHaveAttribute('tabindex', '-1');
			await expect(document.activeElement).toHaveAttribute('data-iso', '2026-08-30');
			await userEvent.keyboard('{ArrowRight}');
			await expect(document.activeElement).toBe(selectedDay);
			await userEvent.keyboard('{ArrowRight}');
			await waitFor(() => {
				expect(document.activeElement).toHaveAttribute('data-iso', '2026-09-01');
			});
		});

		await step('PageDown preserves the focused day in the next month', async () => {
			await userEvent.keyboard('{PageDown}');
			await waitFor(() => {
				expect(document.activeElement).toHaveAttribute('data-iso', '2026-10-01');
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
			await userEvent.click(canvasElement.querySelector('[data-calendar-day][data-iso="2026-08-05"]')!);
			await userEvent.click(canvasElement.querySelector('[data-calendar-day][data-iso="2026-08-20"]')!);
			await expect(host).toHaveAttribute('value', '2026-08-05/2026-08-20');
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
			await userEvent.click(canvasElement.querySelector('[data-calendar-day][data-iso="2026-08-05"]')!);
			await userEvent.click(canvasElement.querySelector('[data-calendar-day][data-iso="2026-08-12"]')!);
			await expect(host).toHaveAttribute('value', '2026-08-05,2026-08-12');
		});
	},
};

export const TwoMonths: Story = {
	args: {
		value: '2026-08-02',
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
		value: '2026-08-02/2026-09-15',
		selectionMode: 'range',
		visibleMonths: 2,
	},
};
