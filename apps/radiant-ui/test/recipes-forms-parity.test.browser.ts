import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, test } from 'vitest';
import { stopControllers } from '@ecopages/radiant/controller-registry';
import '@ecopages/radiant-ui/themes/default';
import '../src/content/components/recipes/calendar-events.css';
import '../src/content/components/recipes/swipe-card.css';
import { initialEvents } from '../src/content/components/recipes/calendar-events.data';
import { mountComponent, mountController, mountForm } from './mount-recipe';
import { until } from './until';

const forms = ['plain', 'element', 'component', 'controller'] as const;
type AnyForm = (typeof forms)[number];

/**
 * Mounts one form of a recipe with no `.primitive-example` frame around it, so only the recipe's own stylesheet
 * applies, as it does where a reader pastes it.
 */
function mountAny(slug: string, form: AnyForm): Promise<HTMLElement> {
	if (form === 'component') return mountComponent(slug);
	if (form === 'controller') return mountController(slug);
	return mountForm(slug, form === 'plain' ? 'plain' : 'radiant');
}

const day = (root: HTMLElement, iso: string) => root.querySelector<HTMLElement>(`[data-iso="${iso}"]`)!;
const ready = async (root: HTMLElement) => {
	await until(() => expect(root.querySelectorAll('[data-event]').length).toBeGreaterThan(0));
	return root;
};
const originalTitle = initialEvents[0].title;

afterEach(() => {
	stopControllers();
	initialEvents[0].title = originalTitle;
	document.body.innerHTML = '';
});

describe.each(forms)('calendar of events, %s form', (form) => {
	test('sets only the day number small, so the events keep the size of the grid', async () => {
		const root = await ready(await mountAny('calendar-events', form));

		const grid = getComputedStyle(root.querySelector('[data-grid]')!).fontSize;
		const number = day(root, '2026-11-03').querySelector('[data-day]')!;
		const event = day(root, '2026-11-03').querySelector('[data-event]')!;

		expect(getComputedStyle(number).fontSize).toBe('12px');
		expect(getComputedStyle(event).fontSize).toBe(grid);
		expect(getComputedStyle(day(root, '2026-11-03')).fontSize).toBe(grid);
	});

	test('shows a title that contains markup as text', async () => {
		initialEvents[0].title = '<img src="x" data-injected>Design review';
		const root = await ready(await mountAny('calendar-events', form));

		const event = day(root, '2026-11-03').querySelector('[data-event]')!;

		expect(root.querySelector('img')).toBeNull();
		expect(event.textContent).toBe('<img src="x" data-injected>Design review');
		expect(event.children).toHaveLength(0);
	});

	test('names each day after its date and the number of events it holds', async () => {
		const root = await ready(await mountAny('calendar-events', form));
		const label = (iso: string) => day(root, iso).getAttribute('aria-label');

		expect(label('2026-11-03')).toBe('Tuesday, November 3, 2026, 2 events');
		expect(label('2026-11-12')).toBe('Thursday, November 12, 2026, 1 event');
		expect(label('2026-11-04')).toBe('Wednesday, November 4, 2026');

		await userEvent.fill(root.querySelector('input')!, 'stand');

		await until(() => expect(label('2026-11-03')).toBe('Tuesday, November 3, 2026, 1 event'));
		expect(label('2026-11-12')).toBe('Thursday, November 12, 2026');
	});
});

describe.each(forms)('swipe card, %s form', (form) => {
	const mount = async () => {
		const root = await mountAny('swipe-card', form);
		await until(() => expect(root.querySelector('[data-swipe-card]')).not.toBeNull());
		return {
			root,
			card: root.querySelector<HTMLElement>('[data-swipe-card]')!,
			dismiss: root.querySelector<HTMLElement>('[data-dismiss]')!,
			restore: root.querySelector<HTMLElement>('[data-restore]')!,
		};
	};

	test('a click that does not focus the Dismiss button still hands focus to the restore button', async () => {
		const { card, dismiss, restore } = await mount();
		expect(document.activeElement).not.toBe(dismiss);

		dismiss.click();

		await until(() => expect(card.hidden).toBe(true));
		await until(() => expect(document.activeElement).toBe(restore));
	});

	test('its own stylesheet makes the card follow the pointer and fly out with a transition', async () => {
		const { card } = await mount();
		const style = getComputedStyle(card);

		expect(style.transitionProperty).toContain('transform');
		expect(style.cursor).toBe('grab');

		const down = new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, clientX: 200 });
		Object.defineProperty(down, 'timeStamp', { value: 1000 });
		card.dispatchEvent(down);
		const up = new PointerEvent('pointerup', { bubbles: true, button: 0, pointerId: 1, clientX: 20 });
		Object.defineProperty(up, 'timeStamp', { value: 1500 });
		card.dispatchEvent(up);

		expect(card.getAnimations().length).toBeGreaterThan(0);
		await until(() => expect(card.hidden).toBe(true));
	});
});
