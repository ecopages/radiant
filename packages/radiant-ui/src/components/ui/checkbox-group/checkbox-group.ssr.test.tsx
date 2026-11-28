import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiAlert } from '../alert/alert';
import { RuiCheckbox, RuiCheckboxElement } from '../checkbox';
import { RuiCheckboxGroup, RuiCheckboxGroupControl } from './checkbox-group';

describe('RuiCheckboxGroup SSR', () => {
	it('serializes unprefixed host props inside another custom element', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiAlert>
					<RuiCheckboxGroup
						value="product,security"
						name="notifications"
						label="Email notifications"
						disabled={false}
						orientation="horizontal"
					>
						<RuiCheckboxGroupControl>
							<RuiCheckbox value="product" checked>
								Product updates
							</RuiCheckbox>
						</RuiCheckboxGroupControl>
					</RuiCheckboxGroup>
				</RuiAlert>,
			),
		);

		expect(html).toMatch(/<rui-checkbox-group[^>]*value="product,security"/);
		expect(html).toMatch(/<rui-checkbox-group[^>]*name="notifications"/);
		expect(html).toMatch(/<rui-checkbox-group[^>]*label="Email notifications"/);
		expect(html).not.toMatch(/<rui-checkbox-group[^>]*\bdisabled=/);
		expect(html).toMatch(/<rui-checkbox-group[^>]*orientation="horizontal"/);
	});

	it('stamps data-disabled on a disabled checkbox option', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiCheckboxGroup
					options={[
						{ value: 'news', label: 'News' },
						{ value: 'travel', label: 'Travel', disabled: true },
					]}
				/>,
			),
		);

		expect(html).toMatch(/<rui-checkbox[^>]*value="travel"[^>]*\sdata-disabled(="")?[\s>]/);
	});

	it('names each checkbox after a group that stands outside a field', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<form method="get">
					<RuiCheckboxGroup
						name="topics"
						value="news"
						options={[
							{ value: 'news', label: 'News' },
							{ value: 'travel', label: 'Travel' },
						]}
					/>
				</form>,
			),
		);

		const inputs = html.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? [];
		expect(inputs).toHaveLength(2);
		for (const input of inputs) {
			expect(input).toMatch(/\sname="topics"/);
		}
		expect(inputs[0]).toMatch(/\schecked(?=[\s=>])/);
	});

	it('names composed checkboxes after the group', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiCheckboxGroup name="topics" value="travel">
					<RuiCheckboxGroupControl>
						<RuiCheckbox value="news">News</RuiCheckbox>
						<RuiCheckbox value="travel">Travel</RuiCheckbox>
					</RuiCheckboxGroupControl>
				</RuiCheckboxGroup>,
			),
		);

		const inputs = html.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? [];
		expect(inputs.map((input) => input.match(/\sname="([^"]*)"/)?.[1])).toEqual(['topics', 'topics']);
	});

	it('disables the server-rendered checkboxes of a disabled group, so the form does not submit them', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiCheckboxGroup
					name="topics"
					value="news"
					disabled
					options={[
						{ value: 'news', label: 'News' },
						{ value: 'travel', label: 'Travel' },
					]}
				/>,
			),
		);

		const inputs = html.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? [];
		expect(inputs).toHaveLength(2);
		for (const input of inputs) {
			expect(input).toMatch(/\sdisabled(?=[\s=>])/);
		}
	});

	it('checks the composed checkboxes whose value the group holds, as the client does', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiCheckboxGroup name="topics" value="travel,news">
					<RuiCheckboxGroupControl>
						<RuiCheckbox value="news">News</RuiCheckbox>
						<RuiCheckbox value="travel" checked={false}>
							Travel
						</RuiCheckbox>
						<RuiCheckbox value="sport" checked>
							Sport
						</RuiCheckbox>
					</RuiCheckboxGroupControl>
				</RuiCheckboxGroup>,
			),
		);

		const inputs = html.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? [];
		expect(
			inputs.map((input) => [input.match(/\svalue="([^"]*)"/)?.[1], /\schecked(?=[\s=>])/.test(input)]),
		).toEqual([
			['news', true],
			['travel', true],
			['sport', false],
		]);
	});

	it('keeps the checked option checked when the view renders without the Radiant bridge', () => {
		const html = renderToString(
			<RuiCheckboxGroup
				value="news"
				options={[
					{ value: 'news', label: 'News' },
					{ value: 'travel', label: 'Travel' },
				]}
			/>,
		);

		const inputs = html.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? [];
		expect(inputs.map((input) => /\schecked(?=[\s=>])/.test(input))).toEqual([true, false]);
	});

	it('disables a headless checkbox the author marked data-disabled, as the group does after it connects', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiCheckboxGroup name="topics" value="news">
					<RuiCheckboxElement value="news" data-disabled>
						<input type="checkbox" data-ref="input" />
					</RuiCheckboxElement>
					<RuiCheckboxElement value="travel">
						<input type="checkbox" data-ref="input" />
					</RuiCheckboxElement>
				</RuiCheckboxGroup>,
			),
		);

		const inputs = html.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? [];
		expect(inputs.map((input) => /\sdisabled(?=[\s=>])/.test(input))).toEqual([true, false]);
	});

	it('leaves a checkbox outside a group unnamed', () => {
		const html = withRadiantServerCustomElementRenderBridge(() => renderToString(<RuiCheckbox value="a" />));

		expect(html).not.toMatch(/<input[^>]*\sname=/);
	});
});
