import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiTree } from './tree';

describe('RuiTree SSR', () => {
	it('writes aria-expanded="false" on a collapsed branch', () => {
		const html = renderToString(
			<RuiTree
				label="Files"
				nodes={[
					{ id: 'src', label: 'src', expanded: false, children: [{ id: 'a', label: 'a.ts' }] },
					{ id: 'docs', label: 'docs', expanded: true, children: [{ id: 'b', label: 'b.md' }] },
				]}
			/>,
		);

		expect(html).toContain('aria-expanded="false"');
		expect(html).toContain('aria-expanded="true"');
	});
});
