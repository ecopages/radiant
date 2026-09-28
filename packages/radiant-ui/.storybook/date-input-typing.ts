import { userEvent } from 'storybook/test';

/** Clicks each segment of a `rui-date-input` and types the matching part of `iso` (`YYYY-MM-DD`). */
export async function typeIsoIntoDateInput(input: HTMLElement, iso: string): Promise<void> {
	const [year, month, day] = iso.split('-');
	await userEvent.click(input.querySelector('[data-date-segment][data-type="month"]') as HTMLElement);
	await userEvent.keyboard(month ?? '');
	await userEvent.click(input.querySelector('[data-date-segment][data-type="day"]') as HTMLElement);
	await userEvent.keyboard(day ?? '');
	await userEvent.click(input.querySelector('[data-date-segment][data-type="year"]') as HTMLElement);
	await userEvent.keyboard(year ?? '');
}
