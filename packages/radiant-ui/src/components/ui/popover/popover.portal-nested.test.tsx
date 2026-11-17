import { createRoot } from '@ecopages/jsx';
import { afterEach, describe, expect, it } from 'vitest';
import { RuiPopover } from './popover';
import { RuiPopover as RuiPopoverElement } from './popover.script';
import { RuiSelect } from '../select/select';
import { RuiSelect as RuiSelectElement } from '../select/select.script';
void RuiPopoverElement;
void RuiSelectElement;

/** A real press fires `pointerdown` first, which `HTMLElement.click()` does not. */
function press(target: HTMLElement): void {
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
	target.click();
}

describe('rui-popover around a portaled rui-select', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	async function mountNested() {
		const container = document.createElement('div');
		const outside = document.createElement('button');
		document.body.append(container, outside);
		createRoot(container).render(
			<RuiPopover trigger={<button type="button">Open</button>}>
				<RuiSelect
					label="Pets"
					portal
					options={[
						{ value: 'cat', label: 'Cat' },
						{ value: 'dog', label: 'Dog' },
					]}
				/>
			</RuiPopover>,
		);
		const host = container.querySelector('rui-popover') as RuiPopoverElement;
		await host.updateComplete;
		host.setOpen(true);
		const surface = document.querySelector('[data-ref="surface"]') as HTMLElement;
		await host.updateComplete;
		expect(surface.parentElement).toBe(document.body);
		const select = surface.querySelector('rui-select') as RuiSelectElement;
		const trigger = select.querySelector('[data-select-trigger]') as HTMLElement;
		return { host, surface, select, trigger, outside };
	}

	it('keeps the popover open while an option in the portaled list is chosen', async () => {
		const { host, select, trigger, surface } = await mountNested();

		const popup = select.querySelector('[data-select-listbox]') as HTMLElement;
		press(trigger);
		await select.updateComplete;
		expect(popup.hidden).toBe(false);
		expect(popup.parentElement).toBe(document.body);
		expect(surface.contains(popup)).toBe(false);

		press(popup.querySelector('[role="option"][data-value="dog"]') as HTMLElement);

		await select.updateComplete;
		expect(select.value).toEqual(['dog']);
		await host.updateComplete;
		expect(host.open).toBe(true);
	});

	it('still closes the popover for a press outside both', async () => {
		const { host, outside, trigger } = await mountNested();
		press(trigger);

		press(outside);

		await host.updateComplete;
		expect(host.open).toBe(false);
	});
});
