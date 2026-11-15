import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { RuiSelect } from '../select/select';
import { RuiSelect as RuiSelectScript } from '../select/select.script';
import { RuiCombobox } from '../combobox/combobox';
import { RuiCombobox as RuiComboboxScript } from '../combobox/combobox.script';
import { RuiNumberField } from '../number-field/number-field';
import { RuiNumberField as RuiNumberFieldScript } from '../number-field/number-field.script';
import { RuiSlider } from '../slider/slider';
import { RuiSlider as RuiSliderScript } from '../slider/slider.script';
import { RuiInput } from '../input/input';
import { RuiTab, RuiTabList, RuiTabPanel, RuiTabPanels } from '../tabs/tabs';
import { RuiTabs, RuiTabs as RuiTabsScript } from '../tabs/tabs.script';
import { RuiDisclosure } from '../disclosure/disclosure';
import { RuiDisclosure as RuiDisclosureScript } from '../disclosure/disclosure.script';
import { RuiListbox } from '../listbox/listbox';
import { RuiListbox as RuiListboxScript } from '../listbox/listbox.script';
import { RuiTagGroup } from '../tag-group/tag-group';
import { RuiTagGroup as RuiTagGroupScript } from '../tag-group/tag-group.script';
import { RuiRadioGroup } from '../radio-group/radio-group';
import { RuiRadioGroup as RuiRadioGroupScript } from '../radio-group/radio-group.script';
import { RuiCheckboxGroup } from '../checkbox-group/checkbox-group';
import { RuiCheckboxGroup as RuiCheckboxGroupScript } from '../checkbox-group/checkbox-group.script';
import { RuiCheckbox as RuiCheckboxScript } from '../checkbox/checkbox.script';
import { RuiToaster } from '../toast/toaster.script';
import { RuiToast as RuiToastScript } from '../toast/toast.script';
import { toast } from '../toast/toast-api';
import { mountOpenDialog, settled, isReachable, describeHit, type Page } from './dialog-composition.harness';
void [
	RuiSelectScript,
	RuiComboboxScript,
	RuiNumberFieldScript,
	RuiSliderScript,
	RuiTabsScript,
	RuiDisclosureScript,
	RuiListboxScript,
	RuiTagGroupScript,
	RuiRadioGroupScript,
	RuiCheckboxGroupScript,
	RuiCheckboxScript,
	RuiToastScript,
];

const OPTIONS = [
	{ value: 'one', label: 'One' },
	{ value: 'two', label: 'Two' },
	{ value: 'three', label: 'Three' },
];

let page: Page;

afterEach(() => {
	page?.cleanup();
});

async function escape(): Promise<void> {
	await userEvent.keyboard('{Escape}');
	await settled();
}

describe('text fields inside a modal rui-dialog', () => {
	it('lets a rui-input take typing, caret keys and Home/End without the dialog or roving handlers', async () => {
		page = await mountOpenDialog(<RuiInput id="name" aria-label="Name" />);
		const input = page.dialog.querySelector('input') as HTMLInputElement;
		await userEvent.click(input);
		await userEvent.keyboard('abc');
		await userEvent.keyboard('{Home}X{End}Y{ArrowLeft}Z');
		expect(input.value).toBe('XabcZY');
		expect(page.dialog.open).toBe(true);
	});

	it('closes the dialog on Escape from a text field', async () => {
		page = await mountOpenDialog(<RuiInput id="name" aria-label="Name" />);
		await userEvent.click(page.dialog.querySelector('input') as HTMLInputElement);
		await userEvent.keyboard('abc');
		await escape();
		expect(page.dialog.open).toBe(false);
		expect(document.activeElement).toBe(page.opener);
	});

	it('steps a rui-number-field with the arrow keys and takes typed digits', async () => {
		page = await mountOpenDialog(<RuiNumberField value={5} minValue={0} maxValue={20} step={1} label="Count" />);
		const input = page.dialog.querySelector('[data-number-field-input]') as HTMLInputElement;
		await userEvent.click(input);
		await userEvent.keyboard('{ArrowUp}{ArrowUp}');
		expect(input.value).toBe('7');
		await userEvent.keyboard('{ArrowDown}');
		expect(input.value).toBe('6');
		await userEvent.keyboard('{Control>}{ArrowUp}{/Control}');
		expect(page.dialog.open).toBe(true);
		await userEvent.clear(input);
		await userEvent.keyboard('12');
		expect(input.value).toBe('12');
		expect(page.dialog.open).toBe(true);
	});

	it('moves a rui-slider thumb with arrows, Home and End and keeps the dialog open', async () => {
		page = await mountOpenDialog(<RuiSlider label="Volume" min={0} max={100} step={10} value={50} />);
		const thumb = page.dialog.querySelector('[role="slider"]') as HTMLElement;
		await userEvent.click(thumb);
		await userEvent.keyboard('{ArrowRight}');
		expect(thumb.getAttribute('aria-valuenow')).toBe('60');
		await userEvent.keyboard('{End}');
		expect(thumb.getAttribute('aria-valuenow')).toBe('100');
		await userEvent.keyboard('{Home}');
		expect(thumb.getAttribute('aria-valuenow')).toBe('0');
		expect(page.dialog.open).toBe(true);
		await escape();
		expect(page.dialog.open).toBe(false);
	});

	it('keeps typing inside a rui-combobox from being taken by the dialog and clears it before closing', async () => {
		page = await mountOpenDialog(<RuiCombobox label="Pets" options={OPTIONS} />);
		const input = page.dialog.querySelector('[data-combobox-input]') as HTMLInputElement;
		await userEvent.click(input);
		await userEvent.keyboard('tw');
		expect(input.value).toBe('tw');
		await escape();
		expect(page.dialog.open).toBe(true);
		await escape();
		expect(input.value).toBe('');
		expect(page.dialog.open).toBe(true);
		await escape();
		expect(page.dialog.open).toBe(false);
	});
});

describe('select and combobox wiring inside a modal rui-dialog', () => {
	it('keeps the dialog name and modality and wires the open select', async () => {
		page = await mountOpenDialog(<RuiSelect label="Pets" options={OPTIONS} />);
		expect(page.surface.getAttribute('aria-modal')).toBe('true');
		expect(page.surface.getAttribute('role')).toBe('dialog');
		expect(page.surface.getAttribute('aria-label')).toBe('Composition dialog');

		const trigger = page.dialog.querySelector('[data-select-trigger]') as HTMLElement;
		const listbox = page.dialog.querySelector('[data-select-listbox]') as HTMLElement;
		await userEvent.click(trigger);
		await settled();
		expect(trigger.getAttribute('role')).toBe('combobox');
		expect(trigger.getAttribute('aria-expanded')).toBe('true');
		const controlled = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
		expect(controlled, 'aria-controls names an element').not.toBeNull();
		expect(listbox.contains(controlled)).toBe(true);

		await userEvent.keyboard('{ArrowDown}');
		const active = document.getElementById(trigger.getAttribute('aria-activedescendant') ?? '');
		expect(active?.getAttribute('role')).toBe('option');
		expect(listbox.contains(active)).toBe(true);

		await escape();
		expect(trigger.getAttribute('aria-expanded')).toBe('false');
		expect(page.surface.getAttribute('aria-modal')).toBe('true');
	});

	it('scrolls a long select list, not the page or the dialog body, when keys walk the options', async () => {
		const many = Array.from({ length: 60 }, (_, index) => ({ value: `v${index}`, label: `Option ${index}` }));
		page = await mountOpenDialog(<RuiSelect label="Many" options={many} />, { scrollBody: true });
		const trigger = page.dialog.querySelector('[data-select-trigger]') as HTMLElement;
		await userEvent.click(trigger);
		await settled();
		const popup = page.dialog.querySelector('[data-select-listbox]') as HTMLElement;
		const option = popup.querySelector('[role="option"]') as HTMLElement;
		let scroller: HTMLElement | null = null;
		for (
			let node = option.parentElement;
			(node && popup.contains(node)) || node === popup;
			node = node.parentElement
		) {
			if (node.scrollHeight > node.clientHeight + 1 && getComputedStyle(node).overflowY !== 'visible') {
				scroller = node;
				break;
			}
			if (node === popup) break;
		}
		expect(scroller, 'a list of 60 options scrolls inside the popup').toBeTruthy();
		const body = page.dialog.querySelector('#scroll-body') as HTMLElement;
		const bodyTop = body.scrollTop;

		for (let step = 0; step < 30; step++) {
			await userEvent.keyboard('{ArrowDown}');
		}
		await settled();
		expect(scroller!.scrollTop).toBeGreaterThan(0);
		expect(window.scrollY).toBe(0);
		expect(body.scrollTop).toBe(bodyTop);
		expect(document.documentElement.style.overflow).toBe('hidden');
	});
});

describe('composites inside a modal rui-dialog', () => {
	it('roves rui-tabs with the arrow keys, Home and End and activates panels', async () => {
		page = await mountOpenDialog(
			<RuiTabs>
				<RuiTabList aria-label="Sections">
					<RuiTab id="a">Alpha</RuiTab>
					<RuiTab id="b">Beta</RuiTab>
					<RuiTab id="c">Gamma</RuiTab>
				</RuiTabList>
				<RuiTabPanels>
					<RuiTabPanel id="a">A body</RuiTabPanel>
					<RuiTabPanel id="b">B body</RuiTabPanel>
					<RuiTabPanel id="c">C body</RuiTabPanel>
				</RuiTabPanels>
			</RuiTabs>,
		);
		const tabs = Array.from(page.dialog.querySelectorAll<HTMLElement>('[role="tab"]'));
		tabs[0].focus();
		await userEvent.keyboard('{ArrowRight}');
		expect(document.activeElement).toBe(tabs[1]);
		await userEvent.keyboard('{End}');
		expect(document.activeElement).toBe(tabs[2]);
		await userEvent.keyboard('{Home}');
		expect(document.activeElement).toBe(tabs[0]);
		await userEvent.click(tabs[1]);
		await settled();
		expect(tabs[1].getAttribute('aria-selected')).toBe('true');
		const panel = page.dialog.querySelector('[role="tabpanel"]:not([hidden])') as HTMLElement;
		expect(panel.textContent).toContain('B body');
		expect(page.dialog.open).toBe(true);
	});

	it('toggles a rui-disclosure with Enter and Space and leaves Escape to the dialog', async () => {
		page = await mountOpenDialog(
			<RuiDisclosure trigger="More">
				<button type="button" id="in-panel">
					Inside
				</button>
			</RuiDisclosure>,
		);
		const trigger = page.dialog.querySelector('[aria-expanded]') as HTMLElement;
		trigger.focus();
		await userEvent.keyboard('{Enter}');
		await settled();
		expect(trigger.getAttribute('aria-expanded')).toBe('true');
		await userEvent.keyboard(' ');
		await settled();
		expect(trigger.getAttribute('aria-expanded')).toBe('false');
		expect(page.dialog.open).toBe(true);
		await escape();
		expect(page.dialog.open).toBe(false);
	});

	it('navigates a rui-listbox with arrows, Home, End and Enter without closing the dialog', async () => {
		page = await mountOpenDialog(<RuiListbox label="Numbers" options={OPTIONS} />);
		const options = Array.from(page.dialog.querySelectorAll<HTMLElement>('[role="option"]'));
		options[0].focus();
		await userEvent.keyboard('{ArrowDown}');
		await userEvent.keyboard('{End}');
		await userEvent.keyboard('{Enter}');
		await settled();
		expect(options[2].getAttribute('aria-selected')).toBe('true');
		expect(page.dialog.open).toBe(true);
	});

	it('roves a rui-tag-group and leaves Escape to the dialog', async () => {
		page = await mountOpenDialog(<RuiTagGroup label="Tags" selectionMode="multiple" tags={OPTIONS} />);
		const tags = Array.from(page.dialog.querySelectorAll<HTMLElement>('[data-tag]'));
		expect(tags.length).toBeGreaterThanOrEqual(3);
		const first = tags.find((tag) => tag.tabIndex === 0) as HTMLElement;
		first.focus();
		await userEvent.keyboard('{ArrowRight}');
		expect(document.activeElement).not.toBe(first);
		expect(page.surface.contains(document.activeElement)).toBe(true);
		expect(page.dialog.open).toBe(true);
		await escape();
		expect(page.dialog.open).toBe(false);
	});

	it('moves a rui-radio-group with the arrow keys and checks the focused radio', async () => {
		page = await mountOpenDialog(<RuiRadioGroup label="Size" name="size" options={OPTIONS} />);
		const radios = Array.from(page.dialog.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
		radios[0].focus();
		await userEvent.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(radios[1]);
		expect(radios[1].checked).toBe(true);
		expect(page.dialog.open).toBe(true);
	});

	it('toggles a rui-checkbox-group checkbox with Space and keeps Tab in the dialog', async () => {
		page = await mountOpenDialog(<RuiCheckboxGroup label="Extras" options={OPTIONS} />);
		const boxes = Array.from(page.dialog.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
		boxes[0].focus();
		await userEvent.keyboard(' ');
		expect(boxes[0].checked).toBe(true);
		for (let step = 0; step < 8; step++) {
			await userEvent.tab();
			expect(page.surface.contains(document.activeElement)).toBe(true);
		}
	});
});

describe('toasts while a modal rui-dialog is open', () => {
	it('shows a toast above the dialog without taking focus, and Escape closes only the dialog', async () => {
		page = await mountOpenDialog(
			<button type="button" id="inside">
				Inside
			</button>,
			{
				before: <RuiToaster />,
			},
		);
		const inside = page.dialog.querySelector('#inside') as HTMLElement;
		inside.focus();
		toast('Saved', { duration: 60_000 });
		await expect
			.poll(() => {
				const shown = document.querySelector('rui-toast');
				return shown !== null && isReachable(shown);
			})
			.toBe(true);
		const item = document.querySelector('rui-toast') as HTMLElement;
		expect(isReachable(item), `the pointer reaches ${describeHit(item)}`).toBe(true);
		expect(document.activeElement).toBe(inside);

		await escape();
		expect(page.dialog.open).toBe(false);
		expect(document.querySelector('rui-toast')).toBeTruthy();
		toast.clear();
	});

	it('does not close the dialog when the toast is clicked', async () => {
		page = await mountOpenDialog(
			<button type="button" id="inside">
				Inside
			</button>,
			{
				before: <RuiToaster />,
			},
		);
		toast('Saved', { duration: 60_000 });
		await expect
			.poll(() => document.querySelector('rui-toast')?.getBoundingClientRect().height ?? 0)
			.toBeGreaterThan(0);
		await userEvent.click(document.querySelector('rui-toast') as HTMLElement);
		await settled();
		expect(page.dialog.open).toBe(true);
		toast.clear();
	});
});
