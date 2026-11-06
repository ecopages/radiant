import '@ecopages/radiant/server/install-ssr-runtime';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiCarousel, RuiCarouselSlide } from './index';

describe('RuiCarousel SSR', () => {
	it('writes wrap="false" on the host when wrap is false', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiCarousel label="Gallery" wrap={false}>
					<RuiCarouselSlide id="a">One</RuiCarouselSlide>
				</RuiCarousel>,
			),
		);

		expect(html).toMatch(/<rui-carousel[^>]*\swrap="false"/);
	});

	it('writes the default wrap="true" on the host', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiCarousel label="Gallery">
					<RuiCarouselSlide id="a">One</RuiCarouselSlide>
				</RuiCarousel>,
			),
		);

		expect(html).toMatch(/<rui-carousel[^>]*\swrap="true"/);
	});
});
