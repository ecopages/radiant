import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiDateInput } from './date-input';

describe('RuiDateInput SSR', () => {
	it('renders locale segment text from value before hydration', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(<RuiDateInput value="2026-01-08" locale="en-US" />),
		);

		expect(html).toContain('>01</span>');
		expect(html).toContain('>08</span>');
		expect(html).toContain('>2026</span>');
		expect(html).toContain('value="2026-01-08"');
	});
});
