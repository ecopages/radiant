import type { JsxRenderable } from '@ecopages/jsx';
import { loadSsrMarkup } from './store/actions';
import {
	createRadiantDocumentStateScriptNode,
	readRadiantDocumentStateFromDom,
} from '../vite-plugin-radiant/runtime/document-state';
import { createAppStore, createStateScriptNode, readStateFromDom, setAppStore } from './store/store';
import {
	ClientStateSection,
	HeroSection,
	NitroRouteSection,
	RadiantElementLabSection,
	SsrRouteSection,
} from './components/playground-sections';

export type AppProps = {
	ssrPreviewContent?: JsxRenderable;
	bootstrapStateScript?: JsxRenderable;
};

export function App({ ssrPreviewContent, bootstrapStateScript }: AppProps = {}) {
	let stateScript = bootstrapStateScript;
	const documentStateScript =
		typeof document === 'undefined'
			? undefined
			: readRadiantDocumentStateFromDom(document)?.state
				? createRadiantDocumentStateScriptNode(readRadiantDocumentStateFromDom(document)!.state)
				: undefined;

	if (!stateScript) {
		const root = typeof document !== 'undefined' ? document.getElementById('app') : undefined;
		const bootstrap = root ? readStateFromDom(root) : undefined;
		const store = createAppStore(bootstrap?.state);
		setAppStore(store);

		stateScript = bootstrap ? createStateScriptNode(bootstrap.state) : undefined;

		if (!bootstrap) {
			void loadSsrMarkup(store);
		}
	}

	return (
		<main class="shell">
			{documentStateScript}
			{stateScript}
			<HeroSection />
			<RadiantElementLabSection />
			<SsrRouteSection ssrPreviewContent={ssrPreviewContent} />
			<ClientStateSection />
			<NitroRouteSection />
		</main>
	);
}
