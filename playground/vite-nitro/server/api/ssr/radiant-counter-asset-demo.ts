import { defineHandler } from 'nitro';
import { resolveRadiantSsrStyleAssets } from 'virtual:radiant/ssr-asset-registry';

export default defineHandler(async () => {
	const { renderSsrComponentResponse } = await import('../../../vite-plugin-radiant/nitro/render');
	const { RadiantCounter } = await import('@/components/radiant-counter.script');

	return renderSsrComponentResponse(RadiantCounter, {
		assets: resolveRadiantSsrStyleAssets('/src/components/radiant-counter.asset-demo.css'),
		initialize: (component) => {
			component.setAttribute('data-fragment-variant', 'asset-demo');
		},
		props: {
			count: 11,
			label: 'Asset-backed SSR counter',
		},
	});
});
