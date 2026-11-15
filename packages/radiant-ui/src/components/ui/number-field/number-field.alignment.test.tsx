import { afterEach, describe, expect, it } from 'vitest';
import { createRoot } from '@ecopages/jsx';
import '../../../styles/styles.css';
import '../../../styles/themes/default.css';
import { RuiNumberField } from './number-field';
import './number-field.script';

async function mount(): Promise<HTMLElement> {
	const container = document.createElement('div');
	container.style.width = '16rem';
	document.body.append(container);
	createRoot(container).render(<RuiNumberField name="width" value={256} />);
	await customElements.whenDefined('rui-number-field');
	await new Promise((resolve) => setTimeout(resolve, 50));
	return container;
}

const centerY = (element: Element) => {
	const rect = element.getBoundingClientRect();
	return rect.top + rect.height / 2;
};

afterEach(() => {
	document.body.replaceChildren();
});

describe('RuiNumberField alignment', () => {
	it('centres the stepper icons on the control, not on the font metrics of a text glyph', async () => {
		const container = await mount();
		const group = container.querySelector('.rui-number-field__group')!;
		const icons = [...container.querySelectorAll('.rui-number-field__stepper > svg')];

		expect(icons).toHaveLength(2);
		for (const icon of icons) {
			expect(Math.abs(centerY(icon) - centerY(group))).toBeLessThanOrEqual(0.5);
		}
	});

	it('fills a group that is sized smaller than the default control, as the docs controls do', async () => {
		const container = await mount();
		const group = container.querySelector<HTMLElement>('.rui-number-field__group')!;
		group.style.transition = 'none';
		group.style.boxSizing = 'border-box';
		group.style.height = '28px';
		group.style.minHeight = '28px';
		const input = group.querySelector<HTMLInputElement>('.rui-number-field__input')!;

		const groupRect = group.getBoundingClientRect();
		const inputRect = input.getBoundingClientRect();
		expect(groupRect.height).toBe(28);
		expect(inputRect.top).toBeGreaterThanOrEqual(groupRect.top + 1 - 0.5);
		expect(inputRect.bottom).toBeLessThanOrEqual(groupRect.bottom - 1 + 0.5);
		for (const icon of group.querySelectorAll('.rui-number-field__stepper > svg')) {
			expect(Math.abs(centerY(icon) - centerY(group))).toBeLessThanOrEqual(0.5);
		}
	});

	it('keeps the plus and minus icons the same size and on the same line', async () => {
		const container = await mount();
		const [minus, plus] = [...container.querySelectorAll('.rui-number-field__stepper > svg')].map((icon) =>
			icon.getBoundingClientRect(),
		);

		expect(minus.width).toBe(plus.width);
		expect(minus.height).toBe(plus.height);
		expect(minus.top).toBe(plus.top);
	});
});
