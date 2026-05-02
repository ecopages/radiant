import { defineHandler } from 'nitro';

export default defineHandler(async () => {
	const { renderSsrComponent, createSsrResponse } = await import('../../render');
	const { RadiantServerCardElement } = await import('@/components/radiant-server-card.script');
	return createSsrResponse(await renderSsrComponent(RadiantServerCardElement));
});
