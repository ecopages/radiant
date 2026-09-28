import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiAlert } from './alert';

describe('RuiAlert SSR', () => {
	it('keeps host globals on the inner semantic surface', () => {
		const html = renderToString(
			<RuiAlert id="status-alert" title="Status" data-state="open">
				Status message
			</RuiAlert>,
		);

		expect(html).toContain('id="status-alert"');
		expect(html).toContain('title="Status"');
		expect(html).toContain('data-state="open"');
		expect(html).toMatch(/<div[^>]*role="alert"/);
		expect(html).not.toMatch(/<rui-alert[^>]*id="status-alert"/);
	});
});
