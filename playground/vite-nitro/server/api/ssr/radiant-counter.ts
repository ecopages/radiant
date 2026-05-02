import { defineHandler } from 'nitro';

export default defineHandler(async () => {
	const { renderSsrComponent, createSsrResponse } = await import('../../render');
	const { RadiantCounter } = await import('@/components/radiant-counter.script');
	return createSsrResponse(
		await renderSsrComponent(RadiantCounter, {
			props: {
				count: 6,
				label: 'SSR counter rendered in Nitro',
			},
		}),
	);
});
