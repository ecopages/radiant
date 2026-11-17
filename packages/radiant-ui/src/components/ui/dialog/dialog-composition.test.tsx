import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page as browserPage, userEvent } from 'vitest/browser';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiSelect } from '../select/select';
import { RuiSelect as RuiSelectScript } from '../select/select.script';
import { RuiCombobox } from '../combobox/combobox';
import { RuiCombobox as RuiComboboxScript } from '../combobox/combobox.script';
import { RuiPopover, RuiPopoverTrigger } from '../popover/popover';
import {
	RuiPopover as RuiPopoverScript,
	RuiPopoverTrigger as RuiPopoverTriggerScript,
} from '../popover/popover.script';
import { RuiHoverCard, RuiHoverCardContent, RuiHoverCardTrigger } from '../hover-card/hover-card';
import { RuiHoverCard as RuiHoverCardScript } from '../hover-card/hover-card.script';
import { RuiTooltip } from '../tooltip/tooltip';
import { RuiTooltip as RuiTooltipScript } from '../tooltip/tooltip.script';
import { RuiMenuButton } from '../menu-button/menu-button';
import { RuiMenuButton as RuiMenuButtonScript } from '../menu-button/menu-button.script';
import { RuiDateField } from '../date-field/date-field';
import { RuiDateField as RuiDateFieldScript } from '../date-field/date-field.script';
import { RuiDateRangePicker } from '../date-range-picker/date-range-picker';
import { RuiDateRangePicker as RuiDateRangePickerScript } from '../date-range-picker/date-range-picker.script';
import { RuiDateInput as RuiDateInputScript } from '../date-input/date-input.script';
import { RuiCalendar as RuiCalendarScript } from '../calendar/calendar.script';
import {
	describeHit,
	isReachable,
	mountOpenDialog,
	settled,
	trackSideEffects,
	type Page,
} from './dialog-composition.harness';
void [
	RuiSelectScript,
	RuiComboboxScript,
	RuiPopoverScript,
	RuiPopoverTriggerScript,
	RuiHoverCardScript,
	RuiTooltipScript,
	RuiMenuButtonScript,
	RuiDateFieldScript,
	RuiDateRangePickerScript,
	RuiDateInputScript,
	RuiCalendarScript,
];

const PETS = [
	{ value: 'cat', label: 'Cat' },
	{ value: 'dog', label: 'Dog' },
	{ value: 'fox', label: 'Fox' },
];

/**
 * One popup kind: how to render it inside the dialog, how a user opens it, and where its parts are.
 *
 * @remarks `open` uses a real pointer or keyboard gesture, never a property write.
 */
type Popup = {
	name: string;
	render: () => JsxRenderable;
	trigger: (page: Page) => HTMLElement;
	surface: (page: Page) => HTMLElement;
	item: (page: Page) => HTMLElement;
	open: (page: Page) => Promise<void>;
	isOpen: (page: Page) => boolean;
	/** Whether activating `item` closes the popup. */
	closesOnActivate: boolean;
	/** Where the Escape key must be sent from while open. */
	focusAfterOpen?: (page: Page) => HTMLElement;
};

const query = <T extends HTMLElement = HTMLElement>(page: Page, selector: string): T =>
	page.dialog.querySelector(selector) as T;
const inBody = <T extends HTMLElement = HTMLElement>(selector: string): T => document.querySelector(selector) as T;

const clickTrigger = (get: (page: Page) => HTMLElement) => async (page: Page) => {
	await userEvent.click(get(page));
	await settled();
};

const POPUPS: Popup[] = [
	{
		name: 'rui-select',
		render: () => <RuiSelect label="Pets" options={PETS} />,
		trigger: (page) => query(page, '[data-select-trigger]'),
		surface: (page) => query(page, '[data-select-listbox]'),
		item: (page) => query(page, '[data-select-listbox] [role="option"][data-value="dog"]'),
		open: clickTrigger((page) => query(page, '[data-select-trigger]')),
		isOpen: (page) => !query(page, '[data-select-listbox]').hidden,
		closesOnActivate: true,
	},
	{
		name: 'rui-combobox',
		render: () => <RuiCombobox label="Pets" options={PETS} />,
		trigger: (page) => query(page, '[data-combobox-input]'),
		surface: (page) => query(page, '[data-combobox-listbox]'),
		item: (page) => query(page, '[data-combobox-listbox] [role="option"][data-value="dog"]'),
		open: async (page) => {
			await userEvent.click(query(page, '[data-combobox-input]'));
			await userEvent.keyboard('{ArrowDown}');
			await settled();
		},
		isOpen: (page) => !query(page, '[data-combobox-listbox]').hidden,
		closesOnActivate: true,
	},
	{
		name: 'rui-popover',
		render: () => (
			<RuiPopoverTrigger trigger={<button type="button">Open popover</button>}>
				<RuiPopover>
					<button type="button" data-inside-popover>
						Inside popover
					</button>
				</RuiPopover>
			</RuiPopoverTrigger>
		),
		trigger: (page) => query(page, '[data-popover-trigger] button'),
		surface: () => inBody('[data-ref="surface"].rui-popover'),
		item: () => inBody('[data-inside-popover]'),
		open: clickTrigger((page) => query(page, '[data-popover-trigger] button')),
		isOpen: () => !inBody('[data-ref="surface"].rui-popover').hidden,
		closesOnActivate: false,
	},
	{
		name: 'rui-menu-button',
		render: () => (
			<RuiMenuButton
				trigger="Actions"
				items={[
					{ value: 'rename', label: 'Rename' },
					{ value: 'copy', label: 'Copy' },
				]}
			/>
		),
		trigger: (page) => query(page, '[data-ref="trigger"]'),
		surface: (page) => query(page, '[role="menu"]'),
		item: (page) => query(page, '[role="menuitem"][data-value="copy"], [role="menuitem"]:nth-of-type(2)'),
		open: clickTrigger((page) => query(page, '[data-ref="trigger"]')),
		isOpen: (page) => !query(page, '[role="menu"]').hidden,
		closesOnActivate: true,
	},
	{
		name: 'rui-date-field calendar',
		render: () => <RuiDateField value="2026-08-07" locale="en-US" label="Start" />,
		trigger: (page) => query(page, '[data-date-field-trigger]'),
		surface: (page) => query(page, '[data-date-field-popover]'),
		item: (page) => query(page, '[data-calendar-day][data-iso="2026-08-12"]'),
		open: clickTrigger((page) => query(page, '[data-date-field-trigger]')),
		isOpen: (page) => !query(page, '[data-date-field-popover]').hidden,
		closesOnActivate: true,
	},
	{
		name: 'rui-date-range-picker calendar',
		render: () => <RuiDateRangePicker value="2026-08-01/2026-08-14" locale="en-US" />,
		trigger: (page) => query(page, '[data-range-trigger]'),
		surface: (page) => query(page, '[data-range-popover]'),
		item: (page) => query(page, '[data-calendar-day][data-iso="2026-08-20"]'),
		open: clickTrigger((page) => query(page, '[data-range-trigger]')),
		isOpen: (page) => !query(page, '[data-range-popover]').hidden,
		closesOnActivate: false,
	},
];

describe.each(POPUPS)('a $name inside a modal rui-dialog', (popup) => {
	let page: Page;

	beforeEach(async () => {
		page = await mountOpenDialog(popup.render());
	});

	afterEach(() => {
		page.cleanup();
	});

	it('renders the open popup above the dialog, so its item is what the pointer reaches', async () => {
		await popup.open(page);
		expect(popup.isOpen(page)).toBe(true);
		const item = popup.item(page);
		expect(isReachable(item), `the pointer reaches ${describeHit(item)}`).toBe(true);
	});

	it('does not close the dialog when an item in the popup is used', async () => {
		await popup.open(page);
		await userEvent.click(popup.item(page));
		await settled();
		expect(page.dialog.open).toBe(true);
		expect(popup.isOpen(page)).toBe(!popup.closesOnActivate);
	});

	it('closes the popup and keeps the dialog on a click inside the dialog outside the popup', async () => {
		await popup.open(page);
		await userEvent.click(page.surface, { position: { x: 4, y: 4 } });
		await settled();
		expect(popup.isOpen(page)).toBe(false);
		expect(page.dialog.open).toBe(true);
	});

	it('closes only the popup on Escape, then the dialog on the second Escape', async () => {
		await popup.open(page);
		await userEvent.keyboard('{Escape}');
		await settled();
		expect(popup.isOpen(page)).toBe(false);
		expect(page.dialog.open).toBe(true);

		await userEvent.keyboard('{Escape}');
		await settled();
		expect(page.dialog.open).toBe(false);
	});

	it('returns focus to the trigger when the popup closes on Escape', async () => {
		await popup.open(page);
		await userEvent.keyboard('{Escape}');
		await settled();
		expect(document.activeElement).toBe(popup.trigger(page));
	});

	it('keeps Tab and Shift+Tab inside the dialog while the popup is closed', async () => {
		const reachable = new Set<Element>();
		for (let step = 0; step < 14; step++) {
			await userEvent.tab();
			expect(page.surface.contains(document.activeElement), `Tab ${step} left the dialog`).toBe(true);
			reachable.add(document.activeElement!);
		}
		for (let step = 0; step < 14; step++) {
			await userEvent.tab({ shift: true });
			expect(page.surface.contains(document.activeElement), `Shift+Tab ${step} left the dialog`).toBe(true);
		}
	});

	it('keeps the page unreachable by Tab while the popup is open', async () => {
		await popup.open(page);
		for (let step = 0; step < 14; step++) {
			await userEvent.tab();
			const active = document.activeElement!;
			expect(
				page.surface.contains(active) || popup.surface(page).contains(active),
				`Tab ${step} reached ${active.tagName.toLowerCase()}#${active.id}`,
			).toBe(true);
		}
	});

	it('returns focus to the opener when the dialog is closed while the popup is open', async () => {
		await popup.open(page);
		page.dialog.open = false;
		await settled();
		expect(document.activeElement).toBe(page.opener);
		expect(popup.isOpen(page)).toBe(false);
	});

	it('dismisses only the popup for a click on the backdrop while the popup is open', async () => {
		await popup.open(page);
		const backdrop = page.dialog.querySelector('[data-ref="backdrop"]') as HTMLElement;
		const rect = backdrop.getBoundingClientRect();
		await userEvent.click(backdrop, { position: { x: 4, y: rect.height - 4 } });
		await settled();
		expect(popup.isOpen(page)).toBe(false);
		expect(page.dialog.open).toBe(true);
	});

	it('closes the dialog on a click on the backdrop once the popup is closed', async () => {
		await popup.open(page);
		await userEvent.keyboard('{Escape}');
		await settled();
		const backdrop = page.dialog.querySelector('[data-ref="backdrop"]') as HTMLElement;
		const rect = backdrop.getBoundingClientRect();
		await userEvent.click(backdrop, { position: { x: 4, y: rect.height - 4 } });
		await settled();
		expect(page.dialog.open).toBe(false);
		expect(document.activeElement).toBe(page.opener);
	});

	it('keeps the popup inside the viewport when the viewport shrinks while it is open', async () => {
		await popup.open(page);
		await browserPage.viewport(300, 520);
		try {
			await settled();
			expect(popup.isOpen(page)).toBe(true);
			const rect = popup.surface(page).getBoundingClientRect();
			expect(rect.left).toBeGreaterThanOrEqual(-0.5);
			expect(rect.right).toBeLessThanOrEqual(window.innerWidth + 0.5);
			expect(page.dialog.open).toBe(true);
		} finally {
			await browserPage.viewport(414, 896);
		}
	});

	it('locks the page scroll once and releases it when the dialog closes', async () => {
		expect(document.documentElement.style.overflow).toBe('hidden');
		await popup.open(page);
		expect(document.documentElement.style.overflow).toBe('hidden');
		page.dialog.open = false;
		await settled();
		expect(document.documentElement.style.overflow).toBe('');
	});

	it('leaves no portaled node, document or window listener, observer, timer or scroll lock when the dialog is removed while open', async () => {
		page.cleanup();
		const tracker = trackSideEffects();
		try {
			page = await mountOpenDialog(popup.render());
			await popup.open(page);
			expect(tracker.listeners().length, 'the tracker sees the open dialog and popup').toBeGreaterThan(0);
			page.cleanup();
			await settled();
			const stray = Array.from(document.body.children).filter((node) => !(node instanceof HTMLScriptElement));
			expect(stray.map((node) => node.tagName)).toEqual([]);
			expect(document.documentElement.style.overflow).toBe('');
			expect(tracker.listeners()).toEqual([]);
			expect(tracker.observers()).toBe(0);
			expect(tracker.timers()).toBe(0);
		} finally {
			tracker.restore();
		}
	});
});

describe('tooltip and hover-card inside a modal rui-dialog', () => {
	let page: Page;

	afterEach(() => {
		page.cleanup();
	});

	it('shows a tooltip and closes it before the dialog on Escape', async () => {
		page = await mountOpenDialog(
			<RuiTooltip content="Saves the draft" delay={0}>
				<button type="button" id="tip-trigger">
					Save
				</button>
			</RuiTooltip>,
		);
		const trigger = page.dialog.querySelector('#tip-trigger') as HTMLElement;
		await userEvent.hover(trigger);
		const tip = page.dialog.querySelector('[role="tooltip"]') as HTMLElement;
		expect(tip.hidden).toBe(false);

		await userEvent.keyboard('{Escape}');
		await settled();
		expect(tip.hidden).toBe(true);
		expect(page.dialog.open).toBe(true);

		await userEvent.keyboard('{Escape}');
		await settled();
		expect(page.dialog.open).toBe(false);
	});

	it('shows a hover card above the dialog and closes it before the dialog on Escape', async () => {
		page = await mountOpenDialog(
			<RuiHoverCard delay={0} closeDelay={0}>
				<RuiHoverCardTrigger>
					<button type="button" id="card-trigger">
						Profile
					</button>
				</RuiHoverCardTrigger>
				<RuiHoverCardContent>
					<span data-card-text>Preview text</span>
				</RuiHoverCardContent>
			</RuiHoverCard>,
		);
		const trigger = page.dialog.querySelector('#card-trigger') as HTMLElement;
		await userEvent.hover(trigger);
		await settled();
		const card = inBody('.rui-hover-card__content');
		expect(card.hidden).toBe(false);
		expect(isReachable(card), `the pointer reaches ${describeHit(card)}`).toBe(true);

		await userEvent.keyboard('{Escape}');
		await settled();
		expect(card.hidden).toBe(true);
		expect(page.dialog.open).toBe(true);
	});
});
