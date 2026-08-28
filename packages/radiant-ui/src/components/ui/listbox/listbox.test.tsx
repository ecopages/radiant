import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { RuiListbox, RuiListboxOption } from './listbox';
import type { RuiListbox as RuiListboxElement } from './listbox.script';
import './listbox.script';

function mount(element: JsxRenderable): { host: HTMLElement; cleanup: () => void } {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root = createRoot(host);
	root.render(element);
	return {
		host,
		cleanup: () => {
			root.unmount();
			host.remove();
		},
	};
}

async function settled(): Promise<void> {
	await customElements.whenDefined('rui-listbox');
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
}

function optionsOf(host: ParentNode): HTMLElement[] {
	return Array.from(host.querySelectorAll('[role="option"]'));
}

describe('RuiListbox', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('puts tabindex on the first selected option in both modes', async () => {
		const { host, cleanup } = mount(
			<RuiListbox selectionMode="multiple" value={['banana', 'cherry']}>
				<RuiListboxOption value="apple">Apple</RuiListboxOption>
				<RuiListboxOption value="banana">Banana</RuiListboxOption>
				<RuiListboxOption value="cherry">Cherry</RuiListboxOption>
			</RuiListbox>,
		);
		await settled();

		const options = optionsOf(host);
		expect(options[0].tabIndex).toBe(-1);
		expect(options[1].tabIndex).toBe(0);
		expect(options[2].tabIndex).toBe(-1);
		cleanup();
	});

	it('keeps embedded options out of the tab order', async () => {
		const { host, cleanup } = mount(
			<RuiListbox embedded value="apple">
				<RuiListboxOption value="apple">Apple</RuiListboxOption>
				<RuiListboxOption value="banana">Banana</RuiListboxOption>
			</RuiListbox>,
		);
		await settled();

		for (const option of optionsOf(host)) {
			expect(option.tabIndex).toBe(-1);
		}
		cleanup();
	});

	it('toggles multiple selection on click and moves focus without toggling on arrow', async () => {
		const { host, cleanup } = mount(
			<RuiListbox selectionMode="multiple" value={['apple']}>
				<RuiListboxOption value="apple">Apple</RuiListboxOption>
				<RuiListboxOption value="banana">Banana</RuiListboxOption>
			</RuiListbox>,
		);
		await settled();

		const list = host.querySelector('rui-listbox') as RuiListboxElement;
		const options = optionsOf(host);
		options[1].click();
		await settled();

		expect(list.value).toBe('apple,banana');
		expect(options[1].getAttribute('aria-selected')).toBe('true');

		options[1].focus();
		options[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
		await settled();

		expect(list.value).toBe('apple,banana');
		expect(document.activeElement).toBe(options[0]);

		options[0].dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
		await settled();
		expect(list.value).toBe('banana');
		cleanup();
	});
});
