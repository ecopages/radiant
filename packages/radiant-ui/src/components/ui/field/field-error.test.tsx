import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { RuiField } from './field';
import { RuiFieldError } from './field-error';
import { RuiField as RuiFieldScript } from './field.script';
void RuiFieldScript;

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
	await customElements.whenDefined('rui-field');
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
	await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('RuiFieldError controlled mode', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('shows a controlled error outside a field', async () => {
		const { host, cleanup } = mount(<RuiFieldError error="Add at least one item" />);
		await settled();

		const error = host.querySelector('[data-rui-field-error]') as HTMLElement;
		expect(error.textContent).toBe('Add at least one item');
		expect(error.hasAttribute('hidden')).toBe(false);
		expect(error.hasAttribute('data-rui-field-error-controlled')).toBe(true);
		cleanup();
	});

	it('renders a controlled error with no content hidden', async () => {
		const { host, cleanup } = mount(<RuiFieldError error="" />);
		await settled();

		const error = host.querySelector('[data-rui-field-error]') as HTMLElement;
		expect(error.hidden).toBe(true);
		cleanup();
	});

	it('keeps a controlled error when the enclosing field syncs without a message', async () => {
		const { host, cleanup } = mount(
			<RuiField name="items">
				<input data-rui-control />
				<RuiFieldError error="Add at least one item" />
			</RuiField>,
		);
		await settled();

		const error = host.querySelector('[data-rui-field-error]') as HTMLElement;
		expect(error.textContent).toBe('Add at least one item');
		expect(error.hidden).toBe(false);
		cleanup();
	});

	it('lists a controlled error in the control description with an id', async () => {
		const { host, cleanup } = mount(
			<RuiField name="items">
				<input data-rui-control />
				<RuiFieldError error="Add at least one item" />
			</RuiField>,
		);
		await settled();

		const error = host.querySelector('[data-rui-field-error]') as HTMLElement;
		const input = host.querySelector('input') as HTMLInputElement;
		expect(error.id).toBeTruthy();
		expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(error.id);
		cleanup();
	});

	it('still lets the field own an uncontrolled error', async () => {
		const { host, cleanup } = mount(
			<RuiField name="email" error="Required">
				<input data-rui-control />
				<RuiFieldError />
			</RuiField>,
		);
		await settled();

		const error = host.querySelector('[data-rui-field-error]') as HTMLElement;
		expect(error.textContent).toBe('Required');
		expect(error.hidden).toBe(false);
		expect(error.hasAttribute('data-rui-field-error-controlled')).toBe(false);
		cleanup();
	});

	it('keeps a controlled error in the control description while a re-render shows and hides it', async () => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		const root = createRoot(host);
		const view = (error: string) => (
			<RuiField name="items">
				<input data-rui-control />
				<RuiFieldError id="items-error" error={error} />
			</RuiField>
		);
		root.render(view(''));
		await settled();

		const input = host.querySelector('input') as HTMLInputElement;
		const error = host.querySelector('[data-rui-field-error]') as HTMLElement;
		const described = () => input.getAttribute('aria-describedby')?.split(' ') ?? [];
		expect(described()).toContain('items-error');
		expect(error.hidden).toBe(true);

		root.render(view('Required'));
		await settled();
		expect(described()).toContain('items-error');
		expect(error.hidden).toBe(false);
		expect(error.textContent).toBe('Required');

		root.render(view(''));
		await settled();
		expect(described()).toContain('items-error');
		expect(error.hidden).toBe(true);
		expect(error.textContent).toBe('');
		root.unmount();
		host.remove();
	});
});
