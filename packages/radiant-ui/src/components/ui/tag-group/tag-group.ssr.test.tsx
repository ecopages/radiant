import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiTag } from './tag-group';

describe('RuiTag SSR', () => {
	it('disables the remove control of a disabled tag before hydration', () => {
		const html = renderToString(
			<RuiTag value="tamed" label="Tamed" disabled>
				Tamed
			</RuiTag>,
		);

		expect(html).toContain('aria-disabled="true"');
		expect(html).toMatch(/<button[^>]*data-tag-remove[^>]*disabled|<button[^>]*disabled[^>]*data-tag-remove/);
	});
});
