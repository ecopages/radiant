import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { addDaysIso, calendarDayButton, endOfMonthIso, monthDayIso, todayIso } from '@sb/calendar-dates';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiForm } from '../form';
import { RuiLabel } from '../label';
import { RuiButton } from '../button';
import {
	RuiDateField,
	RuiDateFieldCalendar,
	RuiDateFieldControl,
	RuiDateFieldInput,
	RuiDateFieldPopover,
	RuiDateFieldToggle,
} from './date-field';
import { RuiDateField as RuiDateFieldElement } from './date-field.script';

const meta = {
	title: 'Components/DateField',
	component: RuiDateField,
	parameters: {
		radiant: {
			element: RuiDateFieldElement,
			cssImports: [
				'../../../styles/primitives.css',
				'../calendar/calendar.css',
				'../label/label.css',
				'./date-field.css',
			],
		},
	},
	args: {
		value: todayIso(),
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
			await expect(host).toHaveAttribute('value', todayIso());
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
	render: () => (
		<RuiDateField label="Appointment date">
			<RuiDateFieldControl>
				<RuiDateFieldInput />
				<RuiDateFieldToggle />
			</RuiDateFieldControl>
			<RuiDateFieldPopover>
				<RuiDateFieldCalendar />
			</RuiDateFieldPopover>
		</RuiDateField>
	),
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-date-field') as HTMLElement;
		const trigger = canvasElement.querySelector('[data-date-field-trigger]') as HTMLButtonElement;

		await step('opens the calendar from the trigger and selects a date', async () => {
			await userEvent.click(trigger);
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			await waitFor(() => {
				expect(document.activeElement?.matches('[data-calendar-day]')).toBe(true);
			});
			const selected = monthDayIso(21);
			await userEvent.click(calendarDayButton(canvasElement, selected));
			await waitFor(() => {
				expect(host.getAttribute('value')).toBe(selected);
			});
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});
	},
};

export const KeyboardCalendar: Story = {
	args: {
		value: endOfMonthIso(),
	},
	play: async ({ canvasElement, step }) => {
		const trigger = canvasElement.querySelector('[data-date-field-trigger]') as HTMLButtonElement;
		const monthEnd = endOfMonthIso();

		await step('the opened calendar accepts day-arrow navigation', async () => {
			await userEvent.click(trigger);
			await waitFor(() => {
				expect(document.activeElement).toHaveAttribute('data-iso', monthEnd);
			});
			await userEvent.keyboard('{ArrowRight}');
			await waitFor(() => {
				expect(document.activeElement).toHaveAttribute('data-iso', addDaysIso(monthEnd, 1));
			});
		});
	},
};

export const DateStyles: Story = {
	render: () => (
		<div class="flex flex-col gap-4">
			<RuiDateField value={todayIso()} dateStyle="short" label="Short" />
			<RuiDateField value={todayIso()} dateStyle="medium" label="Medium" />
			<RuiDateField value={todayIso()} dateStyle="long" label="Long" />
			<RuiDateField value={todayIso()} dateStyle="full" label="Full" />
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
