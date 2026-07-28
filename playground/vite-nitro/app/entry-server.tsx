import '@ecopages/radiant/server/install-ssr-runtime';
import { toRenderedComponentPayload } from '@ecopages/radiant/server/render-component';
import { renderRadiantNitroPage } from '@ecopages/vite-plugin-radiant/nitro';
import { App } from '../src/app';
import { createStateScriptNode, initializeAppStore } from '../src/store/store';

export default {
	async fetch(request: Request) {
		const { RadiantCounter } = await import('../src/components/radiant-counter.script');

		return renderRadiantNitroPage({
			request,
			component: RadiantCounter,
			componentOptions: {
				props: {
					count: 6,
					label: 'SSR counter rendered in Nitro',
				},
			},
			renderPage: ({ rendered }) => {
				const store = initializeAppStore(toRenderedComponentPayload(rendered));

				return <App bootstrapStateScript={createStateScriptNode(store)} />;
			},
		});
	},
};
