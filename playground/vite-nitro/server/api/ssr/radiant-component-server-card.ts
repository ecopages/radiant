import { defineHandler } from 'nitro';

export default defineHandler(async () => {
	const { renderSsrComponent, createSsrResponse } = await import('../../render');
	const { RadiantComponentServerCardElement } = await import('@/components/radiant-component-server-card.script');
	return createSsrResponse(
		await renderSsrComponent({
			component: RadiantComponentServerCardElement,
		}),
	);
});
