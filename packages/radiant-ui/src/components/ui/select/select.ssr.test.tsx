import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiAlert } from '../alert/alert';
import {
	RuiSelect,
	RuiSelectClear,
	RuiSelectControl,
	RuiSelectToggle,
	RuiSelectTrigger,
	RuiSelectValue,
} from './select';

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

	it('renders array values as selected option chips in the convenience view', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiSelect
					selectionMode="multiple"
					value={['draft', 'published']}
					options={[
						{ value: 'draft', label: 'Draft' },
						{ value: 'published', label: 'Published' },
					]}
					placeholder="Choose statuses"
				/>,
			),
		);

		expect(html).toContain('value="draft,published"');
		expect(html).toContain('data-tag');
		expect(html).toContain('Draft');
		expect(html).toContain('Published');
		expect(html).toContain('data-listbox-option-indicator');
		expect(html).toContain('class="rui-icon"');
	});

	it('gives the composable clear control an accessible default label', () => {
		const html = renderToString(
			<RuiSelect>
				<RuiSelectControl>
					<RuiSelectTrigger>
						<RuiSelectValue />
					</RuiSelectTrigger>
					<RuiSelectClear />
					<RuiSelectToggle />
				</RuiSelectControl>
			</RuiSelect>,
		);

		expect(html).toContain('aria-label="Clear selection"');
		expect(html).toContain('class="rui-icon"');
	});

	it('lets clear and toggle children replace the default icons', () => {
		const html = renderToString(
			<RuiSelect>
				<RuiSelectControl>
					<RuiSelectTrigger>
						<RuiSelectValue />
					</RuiSelectTrigger>
					<RuiSelectClear>
						<span data-custom-clear-icon>Clear</span>
					</RuiSelectClear>
					<RuiSelectToggle>
						<span data-custom-toggle-icon>Open</span>
					</RuiSelectToggle>
				</RuiSelectControl>
			</RuiSelect>,
		);

		expect(html).toContain('data-custom-clear-icon');
		expect(html).toContain('data-custom-toggle-icon');
	});
});
