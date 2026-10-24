import '@ecopages/radiant/server/install-ssr-runtime';
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

		expect(html.match(/class="rui-tooltip"/g)).toHaveLength(1);
		expect(html.match(/data-ref="trigger"/g)).toHaveLength(1);
		expect(html.match(/role="tooltip"/g)).toHaveLength(1);
		expect(html.match(/Save your changes/g)).toHaveLength(1);
		expect(html).not.toContain('slot');
	});
});
