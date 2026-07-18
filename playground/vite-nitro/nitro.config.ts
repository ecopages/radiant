import { defineNitroConfig } from 'nitro/config';
import { ECOPAGES_SSR_EXTERNAL } from './ecopages-ssr-external';

export default defineNitroConfig({
	serverDir: './server',
	rollupConfig: {
		external: [...ECOPAGES_SSR_EXTERNAL],
	},
});
