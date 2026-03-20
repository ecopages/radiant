import { defineHandler } from 'nitro';
import { getSsrServerCardPayload } from '../../render-playground';
import { createSsrComponentResponse } from '../../radiant-ssr.ts';

export default defineHandler(async () => {
	const payload = await getSsrServerCardPayload();
	return createSsrComponentResponse(payload);
});
