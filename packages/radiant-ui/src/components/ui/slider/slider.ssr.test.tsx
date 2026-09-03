import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiSlider } from './slider';

describe('RuiSlider SSR', () => {
	it('seeds the value readout, fill, and thumb before hydration', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(<RuiSlider value={50} min={0} max={100} showValue />),
		);

		expect(html).toContain('>50</span>');
		expect(html).toContain('--rui-slider-fill-size: 50%');
		expect(html).toContain('--rui-slider-value: 50%');
		expect(html).toContain('aria-valuenow="50"');
		expect(html).toContain('value="50"');
	});

	it('seeds a range readout and fill between thumbs', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(<RuiSlider variant="range" values={[25, 75]} min={0} max={100} showValue />),
		);

		expect(html).toContain('>25 – 75</span>');
		expect(html).toContain('--rui-slider-fill-start: 25%');
		expect(html).toContain('--rui-slider-fill-size: 50%');
	});
});
