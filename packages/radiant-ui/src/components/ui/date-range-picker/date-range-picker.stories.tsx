import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { RuiField, RuiFieldError } from '../field';
import { RuiForm } from '../form';
import { RuiLabel } from '../label';
import { RuiButton } from '../button';
import { RuiDateRangePicker } from './date-range-picker';

const meta = {
	title: 'Components/DateRangePicker',
	component: RuiDateRangePicker,
	args: {
		value: '2026-08-05/2026-08-20',
		locale: 'en-US',
	},
} satisfies Meta<typeof RuiDateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-date-range-picker') as HTMLElement;

		await step('shows formatted start and end values', async () => {
			await expect(host).toHaveAttribute('value', '2026-08-05/2026-08-20');
			const start = canvasElement.querySelector('[data-range-start]') as HTMLInputElement;
			await expect(start.value.length).toBeGreaterThan(0);
		});
	},
};

export const WithCalendar: Story = {
	args: {
		value: '',
	},
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-date-range-picker') as HTMLElement;
		const trigger = canvasElement.querySelector('[data-range-trigger]') as HTMLButtonElement;

		await step('opens the range calendar and selects dates', async () => {
			await userEvent.click(trigger);
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			await userEvent.click(canvasElement.querySelector('[data-calendar-day][data-iso="2026-08-03"]')!);
			await userEvent.click(canvasElement.querySelector('[data-calendar-day][data-iso="2026-08-14"]')!);
			await waitFor(() => {
				expect(host.getAttribute('value')).toBe('2026-08-03/2026-08-14');
			});
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});
	},
};

export const AsField: Story = {
	render: () => (
		<RuiForm defaultValues={{ trip: '' }} mode="onSubmit">
			<RuiField name="trip" rules={{ required: 'Pick trip dates' }}>
				<RuiLabel>Trip dates</RuiLabel>
				<RuiDateRangePicker placeholderStart="Start" placeholderEnd="End" />
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
