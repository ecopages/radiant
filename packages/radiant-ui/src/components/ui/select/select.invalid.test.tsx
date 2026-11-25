import { afterEach, describe, expect, it } from 'vitest';
import '../../../styles/radiant-ui.css';
import '../../../styles/themes/default.css';
import './select.css';

function mount(invalid: boolean): { control: HTMLElement; reference: HTMLElement } {
	document.body.innerHTML = `
		<div class="rui-select__control" data-testid="control">
			<div class="rui-select__trigger" role="combobox"${invalid ? ' aria-invalid="true"' : ''}></div>
		</div>
		<i data-testid="reference" style="border: 1px solid var(--color-error)"></i>`;
	return {
		control: document.querySelector<HTMLElement>('[data-testid="control"]')!,
		reference: document.querySelector<HTMLElement>('[data-testid="reference"]')!,
	};
}

function borderColor(element: HTMLElement): string {
	element.style.transition = 'none';
	return getComputedStyle(element).borderTopColor;
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('RuiSelect invalid border', () => {
	it('paints the control border with the error colour when its trigger is aria-invalid', () => {
		const { control, reference } = mount(true);
		expect(borderColor(control)).toBe(borderColor(reference));
	});

	it('keeps the normal border when the trigger is not invalid', () => {
		const { control, reference } = mount(false);
		expect(borderColor(control)).not.toBe(borderColor(reference));
	});

	it('keeps the normal border when aria-invalid is false', () => {
		const { control: valid } = mount(false);
		const normal = borderColor(valid);
		document.body.querySelector('[role="combobox"]')!.setAttribute('aria-invalid', 'false');
		expect(borderColor(valid)).toBe(normal);
	});
});
