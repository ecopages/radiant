import { defineHandler } from 'nitro';
import { resolveRadiantSsrStyleAssets } from 'virtual:radiant/ssr-asset-registry';

export default defineHandler(async () => {
	const { renderSsrComponent, createSsrResponse } = await import('../../render');
	const { RadiantComponentCounter } = await import('@/components/radiant-component-counter.script');

	return createSsrResponse(
		await renderSsrComponent(RadiantComponentCounter, {
			assets: resolveRadiantSsrStyleAssets('/src/components/radiant-component-counter.asset-demo.css'),
			initialize: (component) => {
				component.setAttribute('data-fragment-variant', 'asset-demo');
			},
			props: {
				count: 11,
				label: 'Asset-backed SSR counter',
			},
		}),
	);
});
