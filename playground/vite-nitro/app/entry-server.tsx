import { toRenderedComponentPayload } from '@ecopages/radiant/server/render-component';
import { renderRadiantNitroPage } from '../vite-plugin-radiant/nitro/index';
import { App } from '../src/app';
import { createAppStore, createStateScriptNode, setAppStore } from '../src/store/store';

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
				const store = createAppStore(toRenderedComponentPayload(rendered));
				setAppStore(store);

				return <App bootstrapStateScript={createStateScriptNode(store)} ssrPreviewContent={rendered.preview} />;
			},
		});
	},
};
