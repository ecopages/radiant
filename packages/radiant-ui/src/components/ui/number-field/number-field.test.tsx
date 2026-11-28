import { createRoot } from '@ecopages/jsx';
import { afterEach, describe, expect, it } from 'vitest';
import { RuiField as RuiFieldElement } from '../field/field.script';
import { RuiNumberField } from './number-field';
import { RuiNumberField as RuiNumberFieldElement } from './number-field.script';
void RuiFieldElement;

function tick(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

async function settled(): Promise<void> {
	await Promise.resolve();
	await tick();
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('RuiNumberField commit', () => {
	it('commits the typed draft on blur (focusout delegation)', async () => {
		document.body.innerHTML = `
			<rui-number-field name="quantity">
				<input data-number-field-input />
			</rui-number-field>
		`;

		await customElements.whenDefined('rui-number-field');
		await settled();

		const host = document.querySelector('rui-number-field') as RuiNumberFieldElement;
		const input = host.querySelector<HTMLInputElement>('[data-number-field-input]');

		input?.focus();
		if (input) input.value = '3';
		input?.dispatchEvent(new Event('input', { bubbles: true }));
		input?.blur();
		await settled();

		expect(host.value).toBe(3);
	});

	it('submits the raw number through a named host', async () => {
		document.body.innerHTML = `
			<form>
				<rui-number-field name="quantity" value="3">
					<input data-number-field-input />
				</rui-number-field>
			</form>
		`;

		await customElements.whenDefined('rui-number-field');
		await settled();

		const form = document.querySelector('form') as HTMLFormElement;
		expect(new FormData(form).get('quantity')).toBe('3');
	});

	it('keeps the formatted display value in sync after commit', async () => {
		document.body.innerHTML = `
			<rui-number-field name="quantity">
				<input data-number-field-input />
			</rui-number-field>
		`;

		await customElements.whenDefined('rui-number-field');
		await settled();

		const host = document.querySelector('rui-number-field') as RuiNumberFieldElement;
		const input = host.querySelector<HTMLInputElement>('[data-number-field-input]');

		input?.focus();
		if (input) input.value = '7';
		input?.dispatchEvent(new Event('input', { bubbles: true }));
		input?.blur();
		await settled();

		expect(input?.value).toBe('7');
	});

	async function mount(
		attrs = '',
	): Promise<{ host: RuiNumberFieldElement; input: HTMLInputElement; changes: number[] }> {
		document.body.innerHTML = `
			<rui-number-field ${attrs}>
				<input data-number-field-input />
			</rui-number-field>
		`;
		await customElements.whenDefined('rui-number-field');
		await settled();
		const host = document.querySelector('rui-number-field') as RuiNumberFieldElement;
		const input = host.querySelector<HTMLInputElement>('[data-number-field-input]') as HTMLInputElement;
		const changes: number[] = [];
		host.addEventListener('change', () => changes.push(host.value as number));
		return { host, input, changes };
	}

	async function typeAndBlur(input: HTMLInputElement, text: string): Promise<void> {
		input.focus();
		input.value = text;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.blur();
		await settled();
	}

	it('commits a typed 0 on an empty field and emits change', async () => {
		const { host, input, changes } = await mount();

		await typeAndBlur(input, '0');

		expect(host.value).toBe(0);
		expect(changes).toEqual([0]);
	});

	it('keeps the committed value when the typed text has no digits', async () => {
		const { host, input, changes } = await mount();

		await typeAndBlur(input, '5');
		await typeAndBlur(input, 'abc');

		expect(host.value).toBe(5);
		expect(changes).toEqual([5]);
		expect(input.value).toBe('5');
	});

	it('does not emit when the same committed value is typed again', async () => {
		const { host, input, changes } = await mount();

		await typeAndBlur(input, '5');
		await typeAndBlur(input, '5');

		expect(host.value).toBe(5);
		expect(changes).toEqual([5]);
	});

	it('does not commit when an empty field is focused and blurred untouched', async () => {
		const { host, input, changes } = await mount();

		input.focus();
		input.blur();
		await settled();

		expect(host.value).toBeUndefined();
		expect(changes).toEqual([]);
	});

	it('displays an empty field with no aria-valuenow, then 0 once 0 is typed', async () => {
		const { input } = await mount();

		expect(input.value).toBe('');
		expect(input.hasAttribute('aria-valuenow')).toBe(false);

		await typeAndBlur(input, '0');

		expect(input.value).toBe('0');
		expect(input.getAttribute('aria-valuenow')).toBe('0');
	});

	it('submits an empty string for an empty named field', async () => {
		document.body.innerHTML = `
			<form>
				<rui-number-field name="quantity">
					<input data-number-field-input />
				</rui-number-field>
			</form>
		`;
		await customElements.whenDefined('rui-number-field');
		await settled();

		const form = document.querySelector('form') as HTMLFormElement;
		expect(new FormData(form).get('quantity')).toBe('');
	});
});

describe('RuiNumberField read-only state', () => {
	it('mirrors the host read-only state onto the native input', async () => {
		document.body.innerHTML = `
			<rui-number-field name="quantity" value="3" read-only>
				<input data-number-field-input />
			</rui-number-field>
		`;

		await customElements.whenDefined('rui-number-field');
		await settled();

		const host = document.querySelector('rui-number-field') as RuiNumberFieldElement;
		const input = host.querySelector<HTMLInputElement>('[data-number-field-input]') as HTMLInputElement;
		expect(input.readOnly).toBe(true);

		host.readOnly = false;
		await settled();

		expect(input.readOnly).toBe(false);
		expect(input.hasAttribute('data-readonly')).toBe(false);
	});
});

describe('RuiNumberField after a parent rerender', () => {
	it('keeps the localized text and the text type of a connected field', async () => {
		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);
		const view = (tick: number) => (
			<div>
				<span>{tick}</span>
				<RuiNumberField name="price" value={1234.5} locale="de-DE" label="Price" />
			</div>
		);
		root.render(view(1));

		await customElements.whenDefined('rui-number-field');
		await settled();

		const input = container.querySelector<HTMLInputElement>('[data-number-field-input]') as HTMLInputElement;
		expect(input.type).toBe('text');
		expect(input.value).toBe('1.234,5');

		root.render(view(2));
		await settled();

		expect(input.type).toBe('text');
		expect(input.value).toBe('1.234,5');
		root.unmount();
	});
});

describe('RuiNumberField editing text in the field locale', () => {
	async function mountLocale(attrs: string): Promise<{
		host: RuiNumberFieldElement;
		input: HTMLInputElement;
		changes: number[];
	}> {
		document.body.innerHTML = `
			<rui-number-field ${attrs}>
				<input data-number-field-input />
			</rui-number-field>
		`;
		await customElements.whenDefined('rui-number-field');
		await settled();
		const host = document.querySelector('rui-number-field') as RuiNumberFieldElement;
		const input = host.querySelector<HTMLInputElement>('[data-number-field-input]') as HTMLInputElement;
		const changes: number[] = [];
		host.addEventListener('change', () => changes.push(host.value as number));
		return { host, input, changes };
	}

	async function edit(input: HTMLInputElement, text?: string): Promise<void> {
		input.focus();
		if (text !== undefined) {
			input.value = text;
			input.dispatchEvent(new Event('input', { bubbles: true }));
		}
		input.blur();
		await settled();
	}

	it('keeps the value of an untouched field that groups with a dot, after focus and blur', async () => {
		const { host, input, changes } = await mountLocale('locale="de-DE" value="1234.5" step="0.01"');

		await edit(input);

		expect(host.value).toBe(1234.5);
		expect(input.value).toBe('1.234,5');
		expect(changes).toEqual([]);
	});

	it('shows the value without grouping, in the locale, on focus, and reads an edit of it back', async () => {
		const { host, input } = await mountLocale('locale="de-DE" value="1234.5" step="0.01"');

		input.focus();
		expect(input.value).toBe('1234,5');

		input.value = '1234,57';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.blur();
		await settled();

		expect(host.value).toBe(1234.57);
		expect(input.value).toBe('1.234,57');
	});

	it('keeps an integer and a negative number readable on focus', async () => {
		const { host, input } = await mountLocale('locale="de-DE" value="-1234" step="0.01"');

		await edit(input);

		expect(host.value).toBe(-1234);
	});

	it('is unchanged for a locale that groups with a comma and has a dot decimal', async () => {
		const { host, input } = await mountLocale('locale="en-US" value="1234.5" step="0.01"');

		input.focus();
		expect(input.value).toBe('1234.5');
		input.blur();
		await settled();

		expect(host.value).toBe(1234.5);
		expect(input.value).toBe('1,234.5');

		await edit(input, '9,876.25');
		expect(host.value).toBe(9876.25);
	});

	it('reads the focus text back for a locale with a dot decimal and a different grouping, such as de-CH', async () => {
		const { host, input } = await mountLocale('locale="de-CH" value="1234.5" step="0.01"');

		await edit(input);

		expect(host.value).toBe(1234.5);
	});
});

describe('RuiNumberField taking over server markup', () => {
	it('submits the number once, from the host, after the script connects a named server input', async () => {
		document.body.innerHTML = `
			<form>
				<rui-number-field name="quantity" value="2" min-value="1" max-value="9" step="1">
					<input data-number-field-input name="quantity" value="2" min="1" max="9" step="1" type="number" />
				</rui-number-field>
			</form>
		`;

		await customElements.whenDefined('rui-number-field');
		await settled();

		const form = document.querySelector('form') as HTMLFormElement;
		const input = form.querySelector<HTMLInputElement>('[data-number-field-input]') as HTMLInputElement;

		expect(new FormData(form).getAll('quantity')).toEqual(['2']);
		expect(['name', 'min', 'max', 'step'].filter((attribute) => input.hasAttribute(attribute))).toEqual([]);
		expect(input.hasAttribute('value')).toBe(false);
		expect(input.value).toBe('2');
	});

	it('keeps a name the consumer authored on the inner input only', async () => {
		document.body.innerHTML = `
			<form>
				<rui-number-field name="quantity" value="2">
					<input data-number-field-input name="display" />
				</rui-number-field>
			</form>
		`;

		await customElements.whenDefined('rui-number-field');
		await settled();

		const input = document.querySelector<HTMLInputElement>('[data-number-field-input]') as HTMLInputElement;
		expect(input.getAttribute('name')).toBe('display');
	});

	it('submits the number once when a field supplied the name in the server markup', async () => {
		document.body.innerHTML = `
			<form>
				<rui-field name="quantity">
					<rui-number-field name="quantity" value="2">
						<input data-number-field-input name="quantity" value="2" type="number" />
					</rui-number-field>
				</rui-field>
			</form>
		`;

		await customElements.whenDefined('rui-number-field');
		await customElements.whenDefined('rui-field');
		await settled();
		await settled();

		const form = document.querySelector('form') as HTMLFormElement;
		expect(new FormData(form).getAll('quantity')).toEqual(['2']);
	});
});

describe('RuiNumberField text typed before the script loads', () => {
	let lateTags = 0;

	/**
	 * Renders the server markup under a tag the script has not defined yet, lets the visitor type into the
	 * input, then defines the tag so the host upgrades in place.
	 */
	async function upgradeAfterTyping(options: {
		attributes?: string;
		inputAttributes?: string;
		typed?: string;
	}): Promise<{
		host: RuiNumberFieldElement;
		input: HTMLInputElement;
		form: HTMLFormElement;
		beforeUpgrade: FormData;
	}> {
		lateTags += 1;
		const tag = `rui-number-field-late-${lateTags}`;
		document.body.innerHTML = `
			<form method="post">
				<${tag} ${options.attributes ?? ''}>
					<input data-number-field-input type="number" ${options.inputAttributes ?? ''} />
				</${tag}>
			</form>
		`;
		const form = document.querySelector('form') as HTMLFormElement;
		const input = form.querySelector<HTMLInputElement>('[data-number-field-input]') as HTMLInputElement;
		if (options.typed !== undefined) {
			input.value = options.typed;
		}
		expect(form.querySelector(tag)).not.toBeInstanceOf(RuiNumberFieldElement);
		const beforeUpgrade = new FormData(form);

		customElements.define(tag, class extends RuiNumberFieldElement {});
		await settled();

		const host = form.querySelector(tag) as RuiNumberFieldElement;
		expect(host).toBeInstanceOf(RuiNumberFieldElement);
		return { host, input, form, beforeUpgrade };
	}

	const server = {
		attributes: 'name="quantity" default-value="1" min-value="1" max-value="9"',
		inputAttributes: 'name="quantity" value="1" min="1" max="9" step="1"',
	};

	it('keeps a number typed before the upgrade and submits it', async () => {
		const { host, input, form } = await upgradeAfterTyping({ ...server, typed: '3' });

		expect(host.value).toBe(3);
		expect(input.value).toBe('3');
		expect(input.getAttribute('aria-valuenow')).toBe('3');
		expect(new FormData(form).getAll('quantity')).toEqual(['3']);
	});

	it('keeps the server value of a field nobody touched', async () => {
		const { host, input, form } = await upgradeAfterTyping(server);

		expect(host.value).toBe(1);
		expect(input.value).toBe('1');
		expect(new FormData(form).getAll('quantity')).toEqual(['1']);
	});

	it('keeps the server value of an untouched field whose display differs from the raw number', async () => {
		const { host, input, beforeUpgrade } = await upgradeAfterTyping({
			attributes: 'name="price" value="1234.5" locale="de-DE"',
			inputAttributes: 'name="price" value="1234.5" step="1"',
		});

		expect([...beforeUpgrade]).toEqual([['price', '1234.5']]);
		expect(host.value).toBe(1234.5);
		expect(input.type).toBe('text');
		expect(input.inputMode).toBe('decimal');
		expect(input.value).toBe('1.234,5');
	});

	it('adopts 1500 from the number input before upgrading to de-DE text', async () => {
		const { host, input, form } = await upgradeAfterTyping({
			attributes: 'name="price" value="1234.5" locale="de-DE" step="0.5"',
			inputAttributes: 'name="price" value="1234.5" step="0.5"',
			typed: '1500',
		});

		expect(host.value).toBe(1500);
		expect(input.value).toBe('1.500');
		expect(new FormData(form).getAll('price')).toEqual(['1500']);
	});

	it('keeps a number typed into an empty field', async () => {
		const { host, input, form } = await upgradeAfterTyping({
			attributes: 'name="quantity"',
			inputAttributes: 'name="quantity" step="1"',
			typed: '4',
		});

		expect(host.value).toBe(4);
		expect(input.value).toBe('4');
		expect(new FormData(form).getAll('quantity')).toEqual(['4']);
	});

	it('snaps a number typed before the upgrade to the bounds, as a blur after the upgrade does', async () => {
		const { host, input, form } = await upgradeAfterTyping({ ...server, typed: '20' });

		expect(host.value).toBe(9);
		expect(input.value).toBe('9');
		expect(new FormData(form).getAll('quantity')).toEqual(['9']);
	});

	it('keeps the server value when a validating field gets a number out of range', async () => {
		const { host, input } = await upgradeAfterTyping({
			attributes: `${server.attributes} commit-behavior="validate"`,
			inputAttributes: server.inputAttributes,
			typed: '20',
		});

		expect(host.value).toBe(1);
		expect(input.value).toBe('1');
	});

	it('keeps the server value when the input was cleared before the upgrade', async () => {
		const { host, input } = await upgradeAfterTyping({ ...server, typed: '' });

		expect(host.value).toBe(1);
		expect(input.value).toBe('1');
	});

	it('does not emit for the value it adopts', async () => {
		const events: string[] = [];
		const listeners = new AbortController();
		for (const type of ['input', 'change']) {
			document.addEventListener(type, () => events.push(type), { signal: listeners.signal });
		}
		try {
			const { host } = await upgradeAfterTyping({ ...server, typed: '3' });

			expect(host.value).toBe(3);
			expect(events).toEqual([]);
		} finally {
			listeners.abort();
		}
	});

	it('reads a raw number edited before the upgrade as typed, in a locale that groups with a dot', async () => {
		const { host, input, form } = await upgradeAfterTyping({
			attributes: 'name="price" value="1234.5" locale="de-DE" step="0.01"',
			inputAttributes: 'name="price" value="1234.5" step="0.01"',
			typed: '1234.57',
		});

		expect(host.value).toBe(1234.57);
		expect(input.value).toBe('1.234,57');
		expect(new FormData(form).getAll('price')).toEqual(['1234.57']);
	});

	it('adopts exponent notation accepted by the native number input', async () => {
		const { host } = await upgradeAfterTyping({
			attributes: 'name="price" value="1234.5" locale="de-DE" step="0.01"',
			inputAttributes: 'name="price" value="1234.5" step="0.01"',
			typed: '1.5e3',
		});

		expect(host.value).toBe(1500);
	});

	it('keeps a typed 0, which is a value and not an empty field', async () => {
		const empty = await upgradeAfterTyping({
			attributes: 'name="quantity"',
			inputAttributes: 'name="quantity" step="1"',
			typed: '0',
		});
		expect(empty.host.value).toBe(0);
		expect(new FormData(empty.form).getAll('quantity')).toEqual(['0']);

		const filled = await upgradeAfterTyping({
			attributes: 'name="quantity" default-value="1"',
			inputAttributes: 'name="quantity" value="1" step="1"',
			typed: '0',
		});
		expect(filled.host.value).toBe(0);
		expect(new FormData(filled.form).getAll('quantity')).toEqual(['0']);
	});

	it('snaps a number typed below the minimum up to it', async () => {
		const { host } = await upgradeAfterTyping({ ...server, typed: '0' });

		expect(host.value).toBe(1);
	});

	it('snaps a number typed before the upgrade to the step', async () => {
		const { host } = await upgradeAfterTyping({
			attributes: 'name="quantity" value="5" step="5"',
			inputAttributes: 'name="quantity" value="5" step="5"',
			typed: '12',
		});

		expect(host.value).toBe(10);
	});

	it('keeps an in-range number off the step as typed when the field only validates', async () => {
		const { host, input } = await upgradeAfterTyping({
			attributes: 'name="quantity" value="5" step="5" commit-behavior="validate"',
			inputAttributes: 'name="quantity" value="5" step="5"',
			typed: '7',
		});

		expect(host.value).toBe(7);
		expect(input.value).toBe('7');
	});

	it('keeps the server value of a read-only field, which the visitor could not edit after the upgrade', async () => {
		const { host, input } = await upgradeAfterTyping({
			attributes: `${server.attributes} read-only`,
			inputAttributes: `${server.inputAttributes} readonly`,
			typed: '3',
		});

		expect(host.value).toBe(1);
		expect(input.value).toBe('1');
	});

	it('keeps the server value of a disabled field', async () => {
		const { host, input } = await upgradeAfterTyping({
			attributes: `${server.attributes} disabled`,
			inputAttributes: server.inputAttributes,
			typed: '3',
		});

		expect(host.value).toBe(1);
		expect(input.value).toBe('1');
	});

	it('resets to the server value, not to the number typed before the upgrade', async () => {
		const { host, input, form } = await upgradeAfterTyping({ ...server, typed: '3' });
		expect(host.value).toBe(3);

		form.reset();
		await settled();

		expect(host.value).toBe(1);
		expect(input.value).toBe('1');
		expect(new FormData(form).getAll('quantity')).toEqual(['1']);
	});
});
