import { radiantMeta, type StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiCalendar } from './calendar';
import { RuiCalendar as RuiCalendarElement } from './calendar.script';

const meta = {
	title: 'Components/Calendar',
	component: RuiCalendar,
	args: {
		value: '2026-08-02',
	},
};
radiantMeta(meta, { element: RuiCalendarElement, stylesheets: ['./calendar.css'] });

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
