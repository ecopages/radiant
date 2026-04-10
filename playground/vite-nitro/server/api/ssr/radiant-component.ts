import { defineHandler } from 'nitro';

export default defineHandler(async () => {
	const { renderSsrComponent, createSsrResponse } = await import('../../render');
	return createSsrResponse(await renderSsrComponent('counter'));
});
