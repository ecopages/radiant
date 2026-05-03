import { startControllers } from '@ecopages/radiant';
import { createRoot } from '@ecopages/jsx';
import type { JsxRenderable } from '@ecopages/jsx';
import { loadRadiantDomModules } from 'virtual:radiant/dom-module-registry';
import { ensureRadiantAssets } from './client-assets';
import { readRadiantDocumentStateFromDom } from './document-state';

export type StartRadiantAppOptions = {
	app: () => JsxRenderable;
	documentRoot?: Document;
	hydrate?: boolean;
	installHydrator?: boolean;
	root?: HTMLElement;
	rootId?: string;
};

export async function startRadiantApp(options: StartRadiantAppOptions) {
	const documentRoot = options.documentRoot ?? document;
	const shouldHydrate = options.hydrate ?? true;
	const shouldInstallHydrator = options.installHydrator ?? shouldHydrate;

	if (shouldInstallHydrator) {
		await import('@ecopages/radiant/client/install-hydrator');
	}

	const documentState = readRadiantDocumentStateFromDom(documentRoot);

	if (documentState) {
		await ensureRadiantAssets(documentState.state);
	} else {
		await loadRadiantDomModules(documentRoot);
	}

	const rootElement = resolveRadiantAppRoot(options, documentRoot);
	const root = createRoot(rootElement);
	const app = options.app();

	if (shouldHydrate) {
		root.hydrate(app);
	} else {
		root.render(app);
	}

	if (!documentState) {
		await loadRadiantDomModules(rootElement);
	}

	startControllers(documentRoot);

	return root;
}

function resolveRadiantAppRoot(options: StartRadiantAppOptions, documentRoot: Document): HTMLElement {
	if (options.root) {
		return options.root;
	}

	const rootId = options.rootId ?? 'app';
	const root = documentRoot.getElementById(rootId);

	if (!root) {
		throw new Error(`Missing app root element: #${rootId}.`);
	}

	return root;
}
