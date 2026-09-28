import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiKnob } from './knob';

describe('RuiKnob SSR', () => {
	it('seeds the value readout and progress arc before hydration', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(<RuiKnob value={50} min={0} max={100} />),
		);

		expect(html).toContain('>50</span>');
		expect(html).toContain('aria-valuenow="50"');
		expect(html).toContain('value="50"');
		expect(html).toContain('stroke-dasharray');
	});
});
