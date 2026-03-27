import { defineHandler } from 'nitro';
import { getSsrServerCardRender } from '../../render-playground';
import { createSsrComponentResponse } from '../../radiant-ssr.ts';

export default defineHandler(async () => {
	const render = await getSsrServerCardRender();
	return createSsrComponentResponse(render);
});
