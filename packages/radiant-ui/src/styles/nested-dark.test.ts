import { afterEach, describe, expect, it } from 'vitest';
import './radiant-ui.css';
import '../components/ui/button/button.css';

function mount(): { light: HTMLElement; dark: HTMLElement } {
	document.body.innerHTML = `
		<section data-scope="light"><button class="rui-button rui-button--filled" data-probe>Save</button><i data-alias style="background-color: var(--color-surface)"></i></section>
		<section data-scope="dark" class="dark"><button class="rui-button rui-button--filled" data-probe>Save</button><i data-alias style="background-color: var(--color-surface)"></i></section>`;
	return {
		light: document.querySelector<HTMLElement>('[data-scope="light"]')!,
		dark: document.querySelector<HTMLElement>('[data-scope="dark"]')!,
	};
}

function background(scope: HTMLElement, selector: string): string {
	return getComputedStyle(scope.querySelector<HTMLElement>(selector)!).backgroundColor;
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('nested dark scope', () => {
	it('restyles a filled kit button inside a .dark section of a light page', () => {
		const { light, dark } = mount();
		expect(background(dark, '[data-probe]')).not.toBe(background(light, '[data-probe]'));
	});

	it('resolves the --color-* aliases per scope for direct var() readers', () => {
		const { light, dark } = mount();
		expect(background(dark, '[data-alias]')).not.toBe(background(light, '[data-alias]'));
	});
});
