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
						id="publication-status"
						value="published"
						label="Status"
						placeholder="Choose a status"
						disabled={false}
						selectionMode="multiple"
					/>
				</RuiAlert>,
			),
		);

		expect(html).toMatch(/<rui-select[^>]*id="publication-status"/);
		expect(html).toMatch(/<rui-select[^>]*value="published"/);
		expect(html).toMatch(/<rui-select[^>]*label="Status"/);
		expect(html).toMatch(/<rui-select[^>]*placeholder="Choose a status"/);
		expect(html).toMatch(/<rui-select[^>]*disabled="false"/);
		expect(html).toMatch(/<rui-select[^>]*selection-mode="multiple"/);
	});

	it('forwards global, structured, and direct data/aria props to the host', () => {
		const html = renderToString(
			<RuiSelect
				id="publication-status"
				title="Status selector"
				aria={{ label: 'Structured label' }}
				aria-label="Direct label"
				data={{ state: 'closed' }}
				data-state="open"
			/>,
		);

		expect(html).toMatch(/<rui-select[^>]*id="publication-status"/);
		expect(html).toMatch(/<rui-select[^>]*title="Status selector"/);
		expect(html).toMatch(/aria-label="Direct label"/);
		expect(html).toMatch(/data-state="open"/);
		expect(html).not.toContain('Structured label');
	});

	it('does not serialize the view-only options collection', () => {
		const html = renderToString(<RuiSelect options={[{ value: 'draft', label: 'Draft' }]} placeholder="Choose" />);

		expect(html).not.toContain('options=');
		expect(html).toContain('data-select-trigger');
	});
});
