import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiTooltip } from './tooltip';

describe('RuiTooltip SSR', () => {
	it('renders the view-owned trigger and tooltip shell', () => {
		const html = renderToString(
			<RuiTooltip content="Save your changes">
				<button type="button">Save</button>
			</RuiTooltip>,
		);

		expect(html).toContain('class="rui-tooltip"');
		expect(html).toContain('role="tooltip"');
		expect(html).toContain('Save your changes');
		expect(html).not.toContain('slot');
	});
});
