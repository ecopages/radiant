import type { JsxRenderable } from '@ecopages/jsx';
import { createStore } from '@ecopages/signals';
import { loadSsrMarkupIntoState } from './playground-actions';
import {
	createInitialPlaygroundState,
	createPlaygroundStateScriptNode,
	readPlaygroundStateFromDom,
	setPlaygroundState,
} from './playground-state';
import {
	ClientStateSection,
	HeroSection,
	NitroRouteSection,
	RadiantComponentLabSection,
	SsrRouteSection,
} from './playground-view';

export {
	createInitialPlaygroundState,
	createPlaygroundStateScriptNode,
	setPlaygroundState,
	type PlaygroundState,
} from './playground-state';

export type AppProps = {
	ssrPreviewContent?: JsxRenderable;
	bootstrapStateScript?: JsxRenderable;
};

export function App({ ssrPreviewContent, bootstrapStateScript }: AppProps = {}) {
	let stateScript = bootstrapStateScript;

	if (!stateScript) {
		const root = typeof document !== 'undefined' ? document.getElementById('app') : undefined;
		const bootstrap = root ? readPlaygroundStateFromDom(root) : undefined;
		const state = createStore(bootstrap?.state ?? createInitialPlaygroundState());
		setPlaygroundState(state);

		stateScript = bootstrap ? createPlaygroundStateScriptNode(bootstrap.state) : undefined;

		if (!bootstrap) {
			void loadSsrMarkupIntoState(state);
		}
	}

	return (
		<main class="shell">
			{stateScript}
			<HeroSection />
			<RadiantComponentLabSection />
			<SsrRouteSection ssrPreviewContent={ssrPreviewContent} />
			<ClientStateSection />
			<NitroRouteSection />
		</main>
	);
}
