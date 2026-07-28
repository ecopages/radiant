import { defineHandler } from 'nitro';

export default defineHandler(async () => {
	const { renderSsrComponentResponse } = await import('@ecopages/vite-plugin-radiant/ssr');
	const { RadiantCounter } = await import('@/components/radiant-counter.script');
	return renderSsrComponentResponse(RadiantCounter, {
		props: {
			count: 6,
			label: 'SSR counter rendered in Nitro',
		},
	});
});
