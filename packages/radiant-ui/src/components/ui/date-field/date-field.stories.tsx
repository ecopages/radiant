import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiForm } from '../form';
import { RuiLabel } from '../label';
import { RuiButton } from '../button';
import { RuiDateField } from './date-field';
import { RuiDateField as RuiDateFieldElement } from './date-field.script';

const meta = {
	title: 'Components/DateField',
	component: RuiDateField,
	parameters: { radiant: { element: RuiDateFieldElement, cssImports: ['./date-field.css', '../shared/control-toggle.css', '../../../lib/icons/icons.css', '../calendar/calendar.css'] } },
	args: {
		value: '2026-08-02',
		label: 'Appointment date',
	},
} satisfies Meta<typeof RuiDateField>;

export default meta;
type Story = StoryObj<typeof meta>;

const getInput = (root: HTMLElement) => root.querySelector('[data-date-field-input]') as HTMLInputElement;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-date-field') as HTMLElement;
		const input = getInput(canvasElement);

		await step('shows a locale placeholder and formatted value', async () => {
			await expect(input.placeholder.length).toBeGreaterThan(0);
			await expect(input.value.length).toBeGreaterThan(0);
			await expect(host).toHaveAttribute('value', '2026-08-02');
		});
	},
};

export const MaskedTyping: Story = {
	render: () => <RuiDateField locale="en-US" masked />,
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-date-field') as HTMLElement;
		const input = getInput(canvasElement);

		await step('mask guides digit entry', async () => {
			await userEvent.click(input);
			await userEvent.type(input, '08212002');
			await userEvent.click(document.body);
			await waitFor(() => {
				expect((host as HTMLElement & { value?: string }).value).toBe('2002-08-21');
			});
		});
	},
};

export const FreeText: Story = {
	render: () => <RuiDateField locale="en-US" masked={false} dateStyle="medium" />,
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-date-field') as HTMLElement;
		const input = getInput(canvasElement);

		await step('accepts natural language month names', async () => {
			await userEvent.click(input);
			await userEvent.type(input, 'Aug 21, 2002');
			await userEvent.click(document.body);
			await waitFor(() => {
				expect((host as HTMLElement & { value?: string }).value).toBe('2002-08-21');
			});
		});
	},
};

export const WithCalendar: Story = {
	args: {
		value: '',
	},
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-date-field') as HTMLElement;
		const trigger = canvasElement.querySelector('[data-date-field-trigger]') as HTMLButtonElement;

		await step('opens the calendar from the trigger and selects a date', async () => {
			await userEvent.click(trigger);
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			await userEvent.click(canvasElement.querySelector('[data-calendar-day][data-iso="2026-08-21"]')!);
			await waitFor(() => {
				expect(host.getAttribute('value')).toBe('2026-08-21');
			});
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});
	},
};

export const DateStyles: Story = {
	render: () => (
		<div class="flex flex-col gap-4">
			<RuiDateField value="2026-08-02" dateStyle="short" label="Short" />
			<RuiDateField value="2026-08-02" dateStyle="medium" label="Medium" />
			<RuiDateField value="2026-08-02" dateStyle="long" label="Long" />
			<RuiDateField value="2026-08-02" dateStyle="full" label="Full" />
		</div>
	),
};

export const AsField: Story = {
	render: () => (
		<RuiForm defaultValues={{ appointment: '' }} mode="onSubmit">
			<RuiField name="appointment" rules={{ required: 'Pick a date' }}>
				<RuiLabel>Appointment</RuiLabel>
				<RuiDateField placeholder="mm/dd/yyyy" />
				<RuiFieldDescription>Masked while typing; formatted with Intl on blur.</RuiFieldDescription>
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
				await expect(canvas.getByText('Pick a date')).toBeVisible();
			});
		});
	},
};
