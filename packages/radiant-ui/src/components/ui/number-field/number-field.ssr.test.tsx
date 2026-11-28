import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiNumberField, RuiNumberFieldInput } from './number-field';
import { RuiNumberField as RuiNumberFieldElement } from './number-field.script';

describe('RuiNumberFieldInput SSR', () => {
	it('forwards native input attributes', () => {
		const html = renderToString(<RuiNumberFieldInput required name="qty" />);

		expect(html).toContain('required');
		expect(html).toContain('name="qty"');
	});
});

function innerInput(html: string): string {
	const tag = html.match(/<input[^>]*data-number-field-input[^>]*>/)?.[0];
	if (!tag) throw new Error('no inner input in the server markup');
	return tag;
}

describe('RuiNumberField SSR', () => {
	it('names the inner input and gives it the field value, so a form posts it without JavaScript', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<form method="post">
					<RuiNumberField name="quantity" value={2} />
				</form>,
			),
		);

		const input = innerInput(html);
		expect(input).toContain('name="quantity"');
		expect(input).toContain('value="2"');
	});

	it('renders a native number input with the raw value for a localized field', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(<RuiNumberField name="price" value={1234.5} locale="de-DE" />),
		);

		const input = innerInput(html);
		expect(input).toMatch(/\stype="number"/);
		expect(input).toContain('value="1234.5"');
	});

	it('carries min, max and step to the inner input', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(<RuiNumberField name="quantity" value={2} minValue={1} maxValue={9} step={2} />),
		);

		const input = innerInput(html);
		expect(input).toContain('min="1"');
		expect(input).toContain('max="9"');
		expect(input).toContain('step="2"');
	});

	it('leaves out value for an empty field, name for an unnamed one and the unbounded limits', () => {
		const html = withRadiantServerCustomElementRenderBridge(() => renderToString(<RuiNumberField />));

		const input = innerInput(html);
		expect(input).not.toMatch(/\sname=/);
		expect(input).not.toMatch(/\svalue=/);
		expect(input).not.toMatch(/\s(min|max)=/);
		expect(input).not.toContain('Infinity');
	});

	it('starts from defaultValue when the field has no value', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(<RuiNumberField name="quantity" defaultValue={3} />),
		);

		expect(innerInput(html)).toContain('value="3"');
	});

	it('drops the value when the field is emptied before it is serialized again', () => {
		const field = new RuiNumberFieldElement();
		field.name = 'quantity';
		field.value = 2;
		field.innerHTML = '<input data-number-field-input />';
		field.prepareForSsr();
		const input = field.querySelector('input') as HTMLInputElement;
		expect(input.getAttribute('value')).toBe('2');

		field.value = undefined;
		field.prepareForSsr();

		expect(input.hasAttribute('value')).toBe(false);
	});

	it('does not bring the default value back after the value was cleared', () => {
		const field = new RuiNumberFieldElement();
		field.name = 'quantity';
		field.defaultValue = 3;
		field.innerHTML = '<input data-number-field-input />';
		field.prepareForSsr();
		const input = field.querySelector('input') as HTMLInputElement;
		expect(input.getAttribute('value')).toBe('3');

		field.value = undefined;
		field.prepareForSsr();

		expect(input.hasAttribute('value')).toBe(false);
	});
});
