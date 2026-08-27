import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiAlert } from '../alert/alert';
import { RuiCheckbox } from '../checkbox';
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
		expect(html).toMatch(/<rui-checkbox-group[^>]*disabled="false"/);
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

		expect(html).toMatch(/<rui-checkbox[^>]*value="travel"[^>]*data-disabled=""/);
	});
});
