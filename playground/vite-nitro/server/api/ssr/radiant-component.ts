import { defineHandler } from 'nitro';

export default defineHandler(async () => {
	const { renderSsrComponent, createSsrResponse } = await import('../../render');
	const { RadiantComponentCounter } = await import('@/components/radiant-component-counter.script');
	return createSsrResponse(
		await renderSsrComponent({
			component: RadiantComponentCounter,
			configure: (component) => {
				component.count = 6;
				component.label = 'SSR counter rendered in Nitro';
			},
		}),
	);
});
