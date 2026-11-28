import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { customElement } from '@ecopages/radiant';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiField } from './field';
import { RuiNumberField, RuiNumberFieldElement } from '../number-field';
import { RuiRadio, RuiRadioGroup, RuiRadioGroupControl } from '../radio-group';
import { RuiCheckboxGroup } from '../checkbox-group';
import { RuiInput } from '../input';
import { RuiDateRangePicker } from '../date-range-picker';

@customElement('test-field-number-name')
class TestFieldNumberName extends RuiNumberFieldElement {
	override prepareForSsr(): void {
		super.prepareForSsr();
		const input = this.querySelector('input');
		this.setAttribute('data-prepared-name', input?.name ?? '');
	}
}

const render = (node: Parameters<typeof renderToString>[0]) =>
	withRadiantServerCustomElementRenderBridge(() => renderToString(node));

function radios(html: string) {
	return (html.match(/<input[^>]*type="radio"[^>]*>/g) ?? []).map((tag) => ({
		name: tag.match(/\sname="([^"]*)"/)?.[1],
		value: tag.match(/\svalue="([^"]*)"/)?.[1],
		checked: /\schecked(?=[\s=>])/.test(tag),
	}));
}

describe('RuiField name in server markup', () => {
	it('names the radios of a radio group by the field and checks the matching one', () => {
		const html = render(
			<form method="get">
				<RuiField name="size">
					<RuiRadioGroup
						value="m"
						options={[
							{ value: 's', label: 'S' },
							{ value: 'm', label: 'M' },
						]}
					/>
				</RuiField>
			</form>,
		);

		expect(radios(html)).toEqual([
			{ name: 'size', value: 's', checked: false },
			{ name: 'size', value: 'm', checked: true },
		]);
	});

	it('gives two field-named radio groups in one form distinct names', () => {
		const html = render(
			<form method="get">
				<RuiField name="size">
					<RuiRadioGroup
						value="m"
						options={[
							{ value: 's', label: 'S' },
							{ value: 'm', label: 'M' },
						]}
					/>
				</RuiField>
				<RuiField name="color">
					<RuiRadioGroup
						value="red"
						options={[
							{ value: 'red', label: 'Red' },
							{ value: 'blue', label: 'Blue' },
						]}
					/>
				</RuiField>
			</form>,
		);

		expect(radios(html).map((radio) => radio.name)).toEqual(['size', 'size', 'color', 'color']);
		expect(
			radios(html)
				.filter((radio) => radio.checked)
				.map((radio) => `${radio.name}=${radio.value}`),
		).toEqual(['size=m', 'color=red']);
	});

	it('names the composed radios of a radio group by the field', () => {
		const html = render(
			<RuiField name="plan">
				<RuiRadioGroup value="pro">
					<RuiRadioGroupControl>
						<RuiRadio value="free">Free</RuiRadio>
						<RuiRadio value="pro">Pro</RuiRadio>
					</RuiRadioGroupControl>
				</RuiRadioGroup>
			</RuiField>,
		);

		expect(radios(html).map((radio) => [radio.name, radio.checked])).toEqual([
			['plan', false],
			['plan', true],
		]);
	});

	it('names the inner input of a number field by the field and gives it the value', () => {
		const html = render(
			<RuiField name="quantity">
				<RuiNumberField value={2} />
			</RuiField>,
		);

		const input = html.match(/<input[^>]*data-number-field-input[^>]*>/)?.[0] ?? '';
		expect(input).toContain('name="quantity"');
		expect(input).toContain('value="2"');
	});

	it('replaces the control name with the field name, as on the client', () => {
		const html = render(
			<RuiField name="outer">
				<RuiNumberField name="inner" value={2} />
			</RuiField>,
		);

		expect(html.match(/<input[^>]*data-number-field-input[^>]*>/)?.[0]).toContain('name="outer"');
	});

	it('resolves the nearest field name during the control’s own server preparation', () => {
		const html = render(
			<RuiField name="outer">
				<RuiField name="quantity">
					<TestFieldNumberName name="explicit" value={2}>
						<input data-number-field-input />
					</TestFieldNumberName>
				</RuiField>
			</RuiField>,
		);

		expect(html).toContain('data-prepared-name="quantity"');
		expect(html).toMatch(/<input[^>]*\sname="quantity"/);
	});

	it('names every native checkbox in a field-wrapped checkbox group', () => {
		const html = render(
			<RuiField name="topics">
				<RuiCheckboxGroup
					options={[
						{ value: 'news', label: 'News' },
						{ value: 'travel', label: 'Travel' },
					]}
				/>
			</RuiField>,
		);

		const inputs = html.match(/<input[^>]*\stype="checkbox"[^>]*>/g) ?? [];
		expect(inputs.map((input) => input.match(/\sname="([^"]*)"/)?.[1])).toEqual(['topics', 'topics']);
	});

	it('names a directly authored native input before the field serializes', () => {
		const html = render(
			<RuiField name="email">
				<RuiInput />
			</RuiField>,
		);

		expect(html).toMatch(/<input[^>]*\sname="email"/);
	});

	it('preserves the names of each input in a field-wrapped date range', () => {
		const html = render(
			<RuiField name="trip">
				<RuiDateRangePicker startName="arrival" endName="departure" />
			</RuiField>,
		);

		expect(html).toMatch(/<rui-date-input[^>]*\sname="arrival"[^>]*\sdata-range-start/);
		expect(html).toMatch(/<rui-date-input[^>]*\sname="departure"[^>]*\sdata-range-end/);
	});
});
