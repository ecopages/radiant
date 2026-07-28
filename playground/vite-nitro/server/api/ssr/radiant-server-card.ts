import { defineHandler } from 'nitro';

export default defineHandler(async () => {
	const { renderSsrComponentResponse } = await import('@ecopages/vite-plugin-radiant/ssr');
	const { RadiantServerCardElement } = await import('@/components/radiant-server-card.script');
	return renderSsrComponentResponse(RadiantServerCardElement);
});
