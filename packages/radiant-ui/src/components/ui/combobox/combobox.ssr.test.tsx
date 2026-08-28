import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiAlert } from '../alert/alert';
import {
	RuiCombobox,
	RuiComboboxClear,
	RuiComboboxControl,
	RuiComboboxInput,
	RuiComboboxTrigger,
	RuiComboboxValue,
} from './combobox';

describe('RuiCombobox SSR', () => {
	it('serializes unprefixed host props inside another custom element', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiAlert>
					<RuiCombobox
						id="country"
						value="de"
						label="Country"
						placeholder="Choose a country"
						disabled={false}
						selectionMode="multiple"
						triggerKind="focus"
					/>
				</RuiAlert>,
			),
		);

		expect(html).toMatch(/<rui-combobox[^>]*id="country"/);
		expect(html).toMatch(/<rui-combobox[^>]*value="de"/);
		expect(html).toMatch(/<rui-combobox[^>]*label="Country"/);
		expect(html).toMatch(/<rui-combobox[^>]*placeholder="Choose a country"/);
		expect(html).toMatch(/<rui-combobox[^>]*disabled="false"/);
		expect(html).toMatch(/<rui-combobox[^>]*selection-mode="multiple"/);
		expect(html).toMatch(/<rui-combobox[^>]*trigger-kind="focus"/);
	});

	it('does not serialize the view-only options collection', () => {
		const html = renderToString(
			<RuiCombobox options={[{ value: 'de', label: 'Germany' }]} placeholder="Choose" />,
		);

		expect(html).not.toContain('options=');
		expect(html).toContain('data-combobox-input');
	});

	it('serializes array values and renders selected chips', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiCombobox
					selectionMode="multiple"
					value={['cat', 'dog']}
					options={[
						{ value: 'cat', label: 'Cat' },
						{ value: 'dog', label: 'Dog' },
					]}
					placeholder="Choose animals"
				/>,
			),
		);

		expect(html).toContain('value="cat,dog"');
		expect(html).toContain('data-combobox-value');
		expect(html).toContain('data-tag');
		expect(html).toContain('Cat');
		expect(html).toContain('Dog');
		expect(html).toContain('data-listbox-option-indicator');
		expect(html).toContain('class="rui-icon"');
	});

	it('gives the composable clear control an accessible default label', () => {
		const html = renderToString(
			<RuiCombobox>
				<RuiComboboxControl>
					<RuiComboboxInput />
					<RuiComboboxClear />
					<RuiComboboxTrigger />
				</RuiComboboxControl>
			</RuiCombobox>,
		);

		expect(html).toContain('aria-label="Clear selection"');
		expect(html).toContain('class="rui-icon"');
	});

	it('lets clear and trigger children replace the default icons', () => {
		const html = renderToString(
			<RuiCombobox>
				<RuiComboboxControl>
					<RuiComboboxValue />
					<RuiComboboxInput />
					<RuiComboboxClear>
						<span data-custom-clear-icon>Clear</span>
					</RuiComboboxClear>
					<RuiComboboxTrigger>
						<span data-custom-toggle-icon>Open</span>
					</RuiComboboxTrigger>
				</RuiComboboxControl>
			</RuiCombobox>,
		);

		expect(html).toContain('data-combobox-value');
		expect(html).toContain('data-custom-clear-icon');
		expect(html).toContain('data-custom-toggle-icon');
	});
});
