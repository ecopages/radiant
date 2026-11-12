import { beforeEach, describe, expect, test } from 'vitest';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsx = async () => {
	const [runtime, index] = await Promise.all([
		loadModule<typeof import('../src/jsx-runtime.ts')>('../src/jsx-runtime.ts'),
		loadModule<typeof import('../src/index.ts')>('../src/index.ts'),
	]);
	return { jsx: runtime.jsx, createRoot: index.createRoot };
};

type Attrs = Record<string, unknown>;

describe('a spread whose keys change keeps its element', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	async function mount() {
		const { jsx, createRoot } = await loadJsx();
		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);
		const renderInput = (attrs: Attrs) => jsx('input', { ...attrs });
		const renderField = (attrs: Attrs) => jsx('form', { children: jsx('input', { ...attrs }) });
		return { container, root, jsx, renderInput, renderField };
	}

	test('gaining a key sets it on the same focused input', async () => {
		const { container, root, renderInput } = await mount();
		root.render(renderInput({ 'aria-invalid': 'false', value: 'hello' }));
		const input = container.querySelector('input') as HTMLInputElement;
		input.focus();
		input.setSelectionRange(2, 4);

		root.render(renderInput({ 'aria-invalid': 'true', 'aria-describedby': 'err', value: 'hello' }));

		expect(container.querySelector('input')).toBe(input);
		expect(input.getAttribute('aria-describedby')).toBe('err');
		expect(input.getAttribute('aria-invalid')).toBe('true');
		expect(document.activeElement).toBe(input);
		expect([input.selectionStart, input.selectionEnd]).toEqual([2, 4]);
	});

	test('losing a key removes the attribute from the same input', async () => {
		const { container, root, renderInput } = await mount();
		root.render(renderInput({ 'aria-invalid': 'true', 'aria-describedby': 'err' }));
		const input = container.querySelector('input') as HTMLInputElement;

		root.render(renderInput({ 'aria-invalid': 'true' }));

		expect(container.querySelector('input')).toBe(input);
		expect(input.hasAttribute('aria-describedby')).toBe(false);
		expect(input.getAttribute('aria-invalid')).toBe('true');
	});

	test('a key whose value becomes undefined is removed in place', async () => {
		const { container, root, renderInput } = await mount();
		root.render(renderInput({ title: 'tip', disabled: true }));
		const input = container.querySelector('input') as HTMLInputElement;

		root.render(renderInput({ title: undefined, disabled: false }));

		expect(container.querySelector('input')).toBe(input);
		expect(input.hasAttribute('title')).toBe(false);
		expect(input.disabled).toBe(false);
	});

	test('changing values, and replacing every key, keeps the node', async () => {
		const { container, root, renderInput } = await mount();
		root.render(renderInput({ class: 'a', 'data-x': '1' }));
		const input = container.querySelector('input') as HTMLInputElement;

		root.render(renderInput({ class: 'b', 'data-x': '2' }));
		expect(input.className).toBe('b');
		expect(input.dataset.x).toBe('2');

		root.render(renderInput({ 'data-y': '3' }));
		expect(container.querySelector('input')).toBe(input);
		expect(input.hasAttribute('class')).toBe(false);
		expect(input.hasAttribute('data-x')).toBe(false);
		expect(input.dataset.y).toBe('3');
	});

	test('a nested element in a parent child slot keeps its node', async () => {
		const { container, root, renderField } = await mount();
		root.render(renderField({ 'aria-invalid': 'false' }));
		const form = container.querySelector('form');
		const input = container.querySelector('input') as HTMLInputElement;
		input.focus();

		root.render(renderField({ 'aria-invalid': 'true', 'aria-describedby': 'err' }));

		expect(container.querySelector('form')).toBe(form);
		expect(container.querySelector('input')).toBe(input);
		expect(input.getAttribute('aria-describedby')).toBe('err');
		expect(document.activeElement).toBe(input);

		root.render(renderField({}));
		expect(container.querySelector('input')).toBe(input);
		expect(input.attributes.length).toBe(0);
	});

	test('keeps the children of an element whose attributes change', async () => {
		const { container, root, jsx } = await mount();
		const render = (attrs: Attrs, label: string) => jsx('button', { ...attrs, children: label });
		root.render(render({ type: 'button' }, 'one'));
		const button = container.querySelector('button') as HTMLButtonElement;

		root.render(render({ type: 'button', title: 't' }, 'two'));

		expect(container.querySelector('button')).toBe(button);
		expect(button.title).toBe('t');
		expect(button.textContent).toBe('two');
	});

	test('adds and removes a delegated and a native listener without duplicates', async () => {
		const { container, root, renderInput } = await mount();
		let clicks = 0;
		let focuses = 0;
		const onClick = () => {
			clicks += 1;
		};
		const onFocus = () => {
			focuses += 1;
		};
		root.render(renderInput({ type: 'text' }));
		const input = container.querySelector('input') as HTMLInputElement;

		root.render(renderInput({ type: 'text', 'on:click': onClick, 'on:focus': onFocus }));
		root.render(renderInput({ type: 'text', 'on:click': onClick, 'on:focus': onFocus, id: 'x' }));
		expect(container.querySelector('input')).toBe(input);
		input.click();
		input.dispatchEvent(new FocusEvent('focus'));
		expect([clicks, focuses]).toEqual([1, 1]);

		root.render(renderInput({ type: 'text' }));
		expect(container.querySelector('input')).toBe(input);
		input.click();
		input.dispatchEvent(new FocusEvent('focus'));
		expect([clicks, focuses]).toEqual([1, 1]);

		root.render(renderInput({ type: 'text', 'on:click': onClick }));
		input.click();
		expect(clicks).toBe(2);
	});

	test('detaches two bindings that normalize to the same event when both are dropped', async () => {
		const { container, root, renderInput } = await mount();
		let first = 0;
		let second = 0;
		root.render(
			renderInput({
				'on:focus': () => {
					first += 1;
				},
				'on-native:focus': () => {
					second += 1;
				},
			}),
		);
		const input = container.querySelector('input') as HTMLInputElement;
		input.dispatchEvent(new FocusEvent('focus'));
		expect([first, second]).toEqual([1, 1]);

		root.render(renderInput({ id: 'x' }));
		expect(container.querySelector('input')).toBe(input);
		input.dispatchEvent(new FocusEvent('focus'));
		expect([first, second]).toEqual([1, 1]);
	});

	test('a remaining binding keeps its listener when another binding of the same function is dropped', async () => {
		const { container, root, renderInput } = await mount();
		let calls = 0;
		const handler = () => {
			calls += 1;
		};
		root.render(renderInput({ 'on:focus': handler, 'on-native:focus': handler }));
		const input = container.querySelector('input') as HTMLInputElement;

		root.render(renderInput({ 'on:focus': handler }));
		expect(container.querySelector('input')).toBe(input);
		input.dispatchEvent(new FocusEvent('focus'));
		expect(calls).toBe(1);

		root.unmount();
		input.dispatchEvent(new FocusEvent('focus'));
		expect(calls).toBe(1);
	});

	test('swapping a handler while another native binding is dropped leaves one listener', async () => {
		const { container, root, renderInput } = await mount();
		const calls: string[] = [];
		const h1 = () => calls.push('h1');
		const h2 = () => calls.push('h2');
		root.render(renderInput({ 'on:focus': h1, 'on-native:blur': () => calls.push('b') }));
		const input = container.querySelector('input') as HTMLInputElement;

		root.render(renderInput({ 'on:focus': h2 }));
		input.dispatchEvent(new FocusEvent('focus'));
		input.dispatchEvent(new FocusEvent('blur'));
		expect(calls).toEqual(['h2']);

		root.unmount();
		input.dispatchEvent(new FocusEvent('focus'));
		expect(calls).toEqual(['h2']);
	});

	test('a reactive handler keeps its listener when a direct binding of the same function is dropped', async () => {
		const { createSubscribableJsxValue } =
			await loadModule<typeof import('../src/jsx-runtime.ts')>('../src/jsx-runtime.ts');
		const { container, root, renderInput } = await mount();
		let calls = 0;
		const handler = () => {
			calls += 1;
		};
		const source = createSubscribableJsxValue({
			getValue: (() => handler) as unknown as () => string,
			subscribe: () => () => undefined,
		});
		root.render(renderInput({ 'on:focus': source, 'on-native:focus': handler }));
		const input = container.querySelector('input') as HTMLInputElement;
		input.dispatchEvent(new FocusEvent('focus'));
		expect(calls).toBe(2);

		root.render(renderInput({ 'on:focus': source }));
		input.dispatchEvent(new FocusEvent('focus'));
		expect(calls).toBe(3);

		root.unmount();
		input.dispatchEvent(new FocusEvent('focus'));
		expect(calls).toBe(3);
	});

	test('a native handler change swaps the handler once and an object listener keeps working', async () => {
		const { container, root, renderInput } = await mount();
		const calls: string[] = [];
		root.render(renderInput({ 'on:focus': () => calls.push('a') }));
		const input = container.querySelector('input') as HTMLInputElement;
		root.render(renderInput({ 'on:focus': () => calls.push('b') }));
		input.dispatchEvent(new FocusEvent('focus'));
		root.render(renderInput({ 'on:focus': { handleEvent: () => calls.push('obj') } }));
		input.dispatchEvent(new FocusEvent('focus'));
		root.unmount();
		input.dispatchEvent(new FocusEvent('focus'));
		expect(calls).toEqual(['b', 'obj']);
	});

	test('a different tag still replaces the element', async () => {
		const { container, root, jsx } = await mount();
		root.render(jsx('input', { 'aria-invalid': 'true' }));
		const input = container.querySelector('input');

		root.render(jsx('textarea', { 'aria-invalid': 'true' }));

		expect(container.querySelector('input')).toBeNull();
		expect(container.querySelector('textarea')).not.toBe(input);
	});
});
