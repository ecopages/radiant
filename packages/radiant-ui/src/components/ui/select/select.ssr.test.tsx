import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiAlert } from '../alert/alert';
import { RuiSelect } from './select';

describe('RuiSelect SSR', () => {
	it('serializes unprefixed host props inside another custom element', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiAlert>
					<RuiSelect
						value="published"
						label="Status"
						placeholder="Choose a status"
						disabled={false}
						selectionMode="multiple"
					/>
				</RuiAlert>,
			),
		);

		expect(html).toMatch(/<rui-select[^>]*value="published"/);
		expect(html).toMatch(/<rui-select[^>]*label="Status"/);
		expect(html).toMatch(/<rui-select[^>]*placeholder="Choose a status"/);
		expect(html).toMatch(/<rui-select[^>]*disabled="false"/);
		expect(html).toMatch(/<rui-select[^>]*selection-mode="multiple"/);
	});
});
