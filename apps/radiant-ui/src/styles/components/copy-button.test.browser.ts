import { afterEach, describe, expect, it } from 'vitest';
import copyButtonCss from './copy-button.css?inline';

const icons = '<svg data-copy-icon="copy"><path d="M0 0"/></svg><svg data-copy-icon="check"><path d="M0 0"/></svg>';

function mount(): { button: HTMLButtonElement; copy: SVGElement; check: SVGElement } {
	document.head.insertAdjacentHTML('beforeend', `<style data-copy-test>${copyButtonCss}</style>`);
	document.body.innerHTML = `<button type="button" data-copy-button>${icons}</button>`;
	const button = document.querySelector<HTMLButtonElement>('[data-copy-button]')!;
	return {
		button,
		copy: button.querySelector<SVGElement>('[data-copy-icon="copy"]')!,
		check: button.querySelector<SVGElement>('[data-copy-icon="check"]')!,
	};
}

afterEach(() => {
	document.body.innerHTML = '';
	document.head.querySelectorAll('style[data-copy-test]').forEach((style) => style.remove());
});

describe('copy button styles', () => {
	it('shows only the copy icon when idle', () => {
		const { copy, check } = mount();

		expect(getComputedStyle(copy).opacity).toBe('1');
		expect(getComputedStyle(check).opacity).toBe('0');
	});

	it('shows only the check icon, drawn, in the copied state', async () => {
		const { button, copy, check } = mount();

		button.dataset.copyState = 'copied';

		await new Promise((resolve) => setTimeout(resolve, 600));
		expect(getComputedStyle(check).opacity).toBe('1');
		expect(getComputedStyle(copy).opacity).toBe('0');
		expect(getComputedStyle(check.querySelector('path')!).strokeDashoffset).toBe('0px');
	});
});
