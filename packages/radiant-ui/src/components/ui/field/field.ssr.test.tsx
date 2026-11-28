import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { RadiantElement, bindTo, customElement, prop } from '@ecopages/radiant';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { registerSubmissionForSsr } from '@/lib/form/submission';
import { nonEmpty } from '@/lib/non-empty';
import { RuiField } from './field';
import { RuiFieldElement } from './index';
import { RuiNumberField } from '../number-field';
import { RuiRadio, RuiRadioGroup, RuiRadioGroupControl } from '../radio-group';
import { RuiCheckboxGroup } from '../checkbox-group';
import { RuiInput } from '../input';
import { RuiSwitch } from '../switch';
import { RuiCheckbox } from '../checkbox';
import { RuiSlider } from '../slider';
import { RuiKnob } from '../knob';
import { RuiDateInput } from '../date-input';
import { RuiDateField } from '../date-field';
import { RuiDateRangePicker } from '../date-range-picker';

@customElement('test-registered-control')
class TestRegisteredControl extends RadiantElement {
	@prop({ type: String, defaultValue: '' })
	@bindTo({ selector: 'input', attr: 'name', map: nonEmpty })
	name: string;

	@prop({ type: Boolean, defaultValue: false })
	@bindTo({ selector: 'input', prop: 'disabled' })
	disabled: boolean;

	constructor() {
		super();
		registerSubmissionForSsr(this);
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

	it('names a number field by the nearest of two nested fields', () => {
		const html = render(
			<RuiField name="outer">
				<RuiField name="quantity">
					<RuiNumberField name="explicit" value={2} />
				</RuiField>
			</RuiField>,
		);

		const input = html.match(/<input[^>]*data-number-field-input[^>]*>/)?.[0] ?? '';
		expect(input).toContain('name="quantity"');
	});

	it('names a native input by the nearest of two nested fields', () => {
		const html = render(
			<RuiField name="outer">
				<RuiField name="email">
					<RuiInput />
				</RuiField>
			</RuiField>,
		);

		expect(html.match(/<input[^>]*\sname="([^"]*)"/g)).toEqual([expect.stringContaining('name="email"')]);
	});

	it('names the checkboxes of a group by the field, not by the group name', () => {
		const html = render(
			<RuiField name="topics">
				<RuiCheckboxGroup
					name="other"
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

	it.each([
		['switch', <RuiSwitch />, /<input[^>]*\stype="checkbox"[^>]*>/],
		['checkbox', <RuiCheckbox value="a" />, /<input[^>]*\stype="checkbox"[^>]*>/],
		['slider', <RuiSlider value={3} />, /<rui-slider[^>]*>/],
		['knob', <RuiKnob value={3} />, /<rui-knob[^>]*>/],
		['date input', <RuiDateInput />, /<rui-date-input[^>]*>/],
		['date field', <RuiDateField />, /<rui-date-field[^>]*>/],
	])('names a %s by the field in server markup', (_label, control, submitter) => {
		const html = render(<RuiField name="topic">{control}</RuiField>);

		expect(html.match(submitter)?.[0]).toMatch(/\sname="topic"/);
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

	it('names the input of a control host that registers itself, as the catalog hosts do', () => {
		const html = render(
			<RuiField name="custom">
				<TestRegisteredControl>
					<input type="text" />
				</TestRegisteredControl>
			</RuiField>,
		);

		expect(html.match(/<test-registered-control[^>]*>/)?.[0]).toMatch(/\sname="custom"/);
		expect(html.match(/<input[^>]*>/)?.[0]).toMatch(/\sname="custom"/);
	});

	it('names the input of an outer headless field that follows a nested field', () => {
		const html = render(
			<RuiFieldElement name="outer">
				<RuiField name="inner">
					<RuiInput />
				</RuiField>
				<div>
					<input data-rui-control type="text" />
				</div>
			</RuiFieldElement>,
		);

		const names = (html.match(/<input[^>]*>/g) ?? []).map((input) => input.match(/\sname="([^"]*)"/)?.[1]);
		expect(names).toEqual(['inner', 'outer']);
	});

	it('leaves the inputs of a date range picker without start-name and end-name unnamed by the field', () => {
		const html = render(
			<RuiField name="trip">
				<RuiDateRangePicker />
			</RuiField>,
		);

		const inputs = html.match(/<rui-date-input[^>]*>/g) ?? [];
		expect(inputs).toHaveLength(2);
		expect(inputs.some((tag) => /\sname="trip"/.test(tag))).toBe(false);
	});

	it('keeps a checked checkbox checked outside a group, alone and in a field', () => {
		const html = render(
			<form>
				<RuiCheckbox value="a" checked />
				<RuiField name="agree">
					<RuiCheckbox value="b" checked />
				</RuiField>
			</form>,
		);

		const inputs = html.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? [];
		expect(inputs).toHaveLength(2);
		for (const input of inputs) {
			expect(input).toMatch(/\schecked(?=[\s=>])/);
		}
	});

	it.each([
		['native input', <RuiInput />, /<input[^>]*>/],
		['switch', <RuiSwitch />, /<input[^>]*\stype="checkbox"[^>]*>/],
		['checkbox', <RuiCheckbox value="a" />, /<input[^>]*\stype="checkbox"[^>]*>/],
		['number field', <RuiNumberField value={2} />, /<input[^>]*data-number-field-input[^>]*>/],
		['slider', <RuiSlider value={3} />, /<rui-slider[^>]*>/],
		['knob', <RuiKnob value={3} />, /<rui-knob[^>]*>/],
		['date input', <RuiDateInput />, /<rui-date-input[^>]*>/],
	])('disables a %s of a disabled field in server markup', (_label, control, submitter) => {
		const html = render(
			<RuiField name="topic" disabled>
				{control}
			</RuiField>,
		);

		expect(html.match(submitter)?.[0]).toMatch(/\sdisabled(?=[\s=>])/);
	});

	it('leaves the controls of a field that is not disabled enabled', () => {
		const html = render(
			<RuiField name="topic">
				<RuiNumberField value={2} />
			</RuiField>,
		);

		expect(html.match(/<input[^>]*data-number-field-input[^>]*>/)?.[0]).not.toMatch(/\sdisabled/);
	});
});
