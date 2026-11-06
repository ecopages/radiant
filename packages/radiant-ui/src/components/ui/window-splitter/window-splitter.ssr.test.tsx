import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiWindowSplitter } from './window-splitter';

describe('RuiWindowSplitter SSR', () => {
	it('serializes the fallback value when value is not a number', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(<RuiWindowSplitter value={'abc' as unknown as number} primary="a" secondary="b" />),
		);

		expect(html).not.toContain('NaN');
		expect(html).toContain('aria-valuenow="50"');
		expect(html).toContain('width: 50%');
	});
});
