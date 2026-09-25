import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { Error500View } from './500-view';

describe('radiant-ui 500 page', () => {
	it('renders stack details and a copy action', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(Error500View({ detail: 'TypeError: failed to render' })),
		);

		expect(html).toContain('Something went wrong');
		expect(html).toContain('data-error500-copy');
		expect(html).toContain('data-error500-detail');
		expect(html).toContain('TypeError: failed to render');
	});
});
