import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiListbox, RuiListboxOption, RuiListboxOptionIndicator } from './listbox';

describe('RuiListbox SSR', () => {
	it('does not serialize the view-only options collection', () => {
		const html = renderToString(<RuiListbox options={[{ value: 'apple', label: 'Apple' }]} />);

		expect(html).not.toContain('options=');
		expect(html).toContain('data-value="apple"');
	});

	it('serializes array values and stamps multi-select semantics', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiListbox
					selectionMode="multiple"
					value={['apple', 'banana']}
					options={[
						{ value: 'apple', label: 'Apple' },
						{ value: 'banana', label: 'Banana' },
					]}
				/>,
			),
		);

		expect(html).toContain('value="apple,banana"');
		expect(html).toContain('aria-multiselectable="true"');
		expect(html).toContain('data-listbox-option-indicator');
		expect(html).toContain('aria-selected="true"');
	});

	it('omits the default indicator in single-select options usage', () => {
		const html = renderToString(<RuiListbox options={[{ value: 'apple', label: 'Apple' }]} value="apple" />);

		expect(html).not.toContain('data-listbox-option-indicator');
	});

	it('preserves custom indicator children', () => {
		const html = renderToString(
			<RuiListbox selectionMode="multiple" value={['apple']}>
				<RuiListboxOption value="apple">
					Apple
					<RuiListboxOptionIndicator>
						<span data-custom-selection-indicator>Selected</span>
					</RuiListboxOptionIndicator>
				</RuiListboxOption>
			</RuiListbox>,
		);

		expect(html).toContain('data-custom-selection-indicator');
		expect(html).toContain('Selected');
	});
});
