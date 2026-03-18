import { defineHandler } from 'nitro';
import { getSsrCounterPayload } from '../../render-playground';

export default defineHandler(async () => {
	const payload = await getSsrCounterPayload();

	return new Response(payload.markup, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'x-generated-at': payload.generatedAt,
			'x-radiant-tag-name': payload.tagName,
		},
	});
});
