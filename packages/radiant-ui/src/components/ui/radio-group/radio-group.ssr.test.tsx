import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiAlert } from '../alert/alert';
import { RuiRadio, RuiRadioGroup, RuiRadioGroupControl } from './radio-group';

describe('RuiRadioGroup SSR', () => {
	it('serializes unprefixed host props inside another custom element', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiAlert>
					<RuiRadioGroup value="email" name="contact" label="Preferred contact method" disabled={false}>
						<RuiRadioGroupControl>
							<RuiRadio value="email">Email</RuiRadio>
						</RuiRadioGroupControl>
					</RuiRadioGroup>
				</RuiAlert>,
			),
		);

		expect(html).toMatch(/<rui-radio-group[^>]*value="email"/);
		expect(html).toMatch(/<rui-radio-group[^>]*name="contact"/);
		expect(html).toMatch(/<rui-radio-group[^>]*label="Preferred contact method"/);
		expect(html).not.toMatch(/<rui-radio-group[^>]*\bdisabled=/);
	});

	it('gives every native radio the group name', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiRadioGroup name="plan" label="Plan">
					<RuiRadioGroupControl>
						<RuiRadio value="free">Free</RuiRadio>
						<RuiRadio value="pro">Pro</RuiRadio>
						<RuiRadio value="team">Team</RuiRadio>
					</RuiRadioGroupControl>
				</RuiRadioGroup>,
			),
		);

		const radios = html.match(/<input[^>]*type="radio"[^>]*>/g) ?? [];
		expect(radios).toHaveLength(3);
		for (const radio of radios) expect(radio).toContain('name="plan"');
	});

	it('checks the radio that matches the group value', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiRadioGroup
					name="variantId"
					value="m"
					options={[
						{ value: 's', label: 'Small' },
						{ value: 'm', label: 'Medium' },
						{ value: 'l', label: 'Large' },
					]}
				/>,
			),
		);

		expect(radioInputs(html).map((radio) => [radio.value, radio.checked])).toEqual([
			['s', false],
			['m', true],
			['l', false],
		]);
	});

	it('checks nothing when the group has no value or none matches', () => {
		for (const value of [undefined, 'xl']) {
			const html = withRadiantServerCustomElementRenderBridge(() =>
				renderToString(
					<RuiRadioGroup name="variantId" value={value}>
						<RuiRadioGroupControl>
							<RuiRadio value="s">Small</RuiRadio>
							<RuiRadio value="m">Medium</RuiRadio>
						</RuiRadioGroupControl>
					</RuiRadioGroup>,
				),
			);

			expect(radioInputs(html).some((radio) => radio.checked)).toBe(false);
		}
	});

	it('checks nothing and names the radios when the group has no props', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiRadioGroup>
					<RuiRadioGroupControl>
						<RuiRadio value="s">Small</RuiRadio>
						<RuiRadio value="m">Medium</RuiRadio>
					</RuiRadioGroupControl>
				</RuiRadioGroup>,
			),
		);

		expect(radioInputs(html).map((radio) => [radio.name, radio.checked])).toEqual([
			['rui-radio-group', false],
			['rui-radio-group', false],
		]);
	});

	it('submits the group value from composed radios without JavaScript', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<form method="get">
					<RuiRadioGroup name="sort" value="price-asc">
						<RuiRadioGroupControl>
							<RuiRadio value="relevance">Relevance</RuiRadio>
							<RuiRadio value="price-asc">Price, low to high</RuiRadio>
							<RuiRadio value="price-desc">Price, high to low</RuiRadio>
						</RuiRadioGroupControl>
					</RuiRadioGroup>
				</form>,
			),
		);

		expect(
			radioInputs(html)
				.filter((radio) => radio.checked)
				.map((radio) => `${radio.name}=${radio.value}`),
		).toEqual(['sort=price-asc']);
	});
});

type ServerRadio = { name: string | undefined; value: string | undefined; checked: boolean };

function radioInputs(html: string): ServerRadio[] {
	return (html.match(/<input[^>]*type="radio"[^>]*>/g) ?? []).map((tag) => ({
		name: tag.match(/\sname="([^"]*)"/)?.[1],
		value: tag.match(/\svalue="([^"]*)"/)?.[1],
		checked: /\schecked(?=[\s=>])/.test(tag),
	}));
}
