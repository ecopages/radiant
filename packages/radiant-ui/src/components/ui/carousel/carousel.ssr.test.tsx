import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiCarousel } from './carousel';

describe('RuiCarousel SSR', () => {
	it('server-renders indicator buttons with their type and class', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiCarousel
					showIndicators
					slides={[
						{ id: 'a', children: 'A' },
						{ id: 'b', children: 'B' },
					]}
				/>,
			),
		);

		expect(html).toMatch(/<button[^>]*data-carousel-indicator="0"[^>]*>/);
		const indicator = html.match(/<button[^>]*data-carousel-indicator="0"[^>]*>/)?.[0] ?? '';
		expect(indicator).toContain('type="button"');
		expect(indicator).toContain('class="rui-carousel__indicator"');
	});
});
