import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiField } from './field';
import { RuiNumberField } from '../number-field';
import { RuiRadio, RuiRadioGroup, RuiRadioGroupControl } from '../radio-group';

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
});
