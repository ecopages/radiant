import { installLightDomShim } from '@ecopages/radiant/server/light-dom-shim';
import { defineHandler } from 'nitro';

export default defineHandler(async () => {
	installLightDomShim();
	const [{ getSsrSignalReleaseBoardRender }, { createSsrComponentResponse }] = await Promise.all([
		import('../../render-playground'),
		import('../../radiant-ssr.ts'),
	]);
	const render = await getSsrSignalReleaseBoardRender();
	return createSsrComponentResponse(render);
});
