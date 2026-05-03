import { defineHandler } from 'nitro';

export default defineHandler(async () => {
	const { renderSsrComponentResponse } = await import('../../../vite-plugin-radiant/nitro/render');
	const { RadiantServerCardElement } = await import('@/components/radiant-server-card.script');
	return renderSsrComponentResponse(RadiantServerCardElement);
});
