import type { JsxRenderable } from '@ecopages/jsx';
import { loadSsrMarkup } from './store/actions';
import type { StartRadiantAppBootstrapResult } from '@ecopages/vite-plugin-radiant/runtime';
import {
	createRadiantDocumentStateScriptNode,
	readRadiantDocumentStateFromDom,
} from '@ecopages/vite-plugin-radiant/runtime';
import { initializeAppStore, createStateScriptNode, readStateFromDom } from './store/store';

export type AppBootstrapProps = {
	bootstrapStateScript?: JsxRenderable;
	documentStateScript?: JsxRenderable;
};

export type AppBootstrapResult = StartRadiantAppBootstrapResult<AppBootstrapProps> & {
	appProps: {
		bootstrapStateScript?: JsxRenderable;
		documentStateScript?: JsxRenderable;
	};
};

export function bootstrapClientApp(documentRoot: Document = document): AppBootstrapResult {
	const root = documentRoot.getElementById('app');
	const bootstrap = root ? readStateFromDom(root) : undefined;
	const documentState = readRadiantDocumentStateFromDom(documentRoot);
	const store = initializeAppStore(bootstrap?.state);

	return {
		appProps: {
			bootstrapStateScript: bootstrap ? createStateScriptNode(bootstrap.state) : undefined,
			documentStateScript: documentState?.state
				? createRadiantDocumentStateScriptNode(documentState.state)
				: undefined,
		},
		onStarted: () => {
			if (!bootstrap) {
				void loadSsrMarkup(store);
			}
		},
	};
}
