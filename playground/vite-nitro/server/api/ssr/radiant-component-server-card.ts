import { installLightDomShim } from '@ecopages/radiant/server/light-dom-shim';
import { defineHandler } from 'nitro';

export default defineHandler(async () => {
	installLightDomShim();
	const [{ getSsrServerCardRender }, { createSsrComponentResponse }] = await Promise.all([
		import('../../render-playground'),
		import('../../radiant-ssr.ts'),
	]);
	const render = await getSsrServerCardRender();
	return createSsrComponentResponse(render);
});
