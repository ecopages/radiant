import { defineHandler } from 'nitro';
import { getSsrCounterRender } from '../../render-playground';
import { createSsrComponentResponse } from '../../radiant-ssr.ts';

export default defineHandler(async () => {
	const render = await getSsrCounterRender();
	return createSsrComponentResponse(render);
});
