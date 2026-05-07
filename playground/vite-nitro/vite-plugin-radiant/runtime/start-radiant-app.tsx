import { startControllers } from '@ecopages/radiant';
import {
	prepareRadiantApp,
	type RadiantAppBootstrap,
	type RadiantAppBootstrapContext,
	type RadiantAppBootstrapResult,
} from '@ecopages/radiant/client/app-bootstrap';
import { createRoot } from '@ecopages/jsx';
import type { JsxRenderable } from '@ecopages/jsx';
import { resolveRadiantAppLoadMode } from 'virtual:radiant/app-load-mode';
import { loadRadiantDomModules } from 'virtual:radiant/dom-module-registry';
import { ensureRadiantAssets } from './client-assets';
import { readRadiantDocumentStateFromDom } from './document-state';

export type StartRadiantAppBootstrapContext = RadiantAppBootstrapContext;

export type StartRadiantAppBootstrapResult<AppProps> = RadiantAppBootstrapResult<AppProps>;

export type StartRadiantAppOptions<AppProps = void> = {
	app: (props: AppProps) => JsxRenderable;
	bootstrap?: RadiantAppBootstrap<AppProps>;
	documentRoot?: Document;
	hydrate?: boolean;
	installHydrator?: boolean;
	root?: HTMLElement;
	rootId?: string;
};

export async function startRadiantApp<AppProps = void>(options: StartRadiantAppOptions<AppProps>) {
	const documentRoot = options.documentRoot ?? document;
	const requestedAppLoadMode = resolveRadiantAppLoadMode(globalThis.location?.href ?? '');
	const shouldHydrate = options.hydrate ?? requestedAppLoadMode !== 'client-only';
	const shouldInstallHydrator = options.installHydrator ?? shouldHydrate;
	const rootElement = resolveRadiantAppRoot(options, documentRoot);

	if (shouldInstallHydrator) {
		await import('@ecopages/radiant/client/install-hydrator');
	}

	const preparedApp = await prepareRadiantApp({
		app: options.app,
		bootstrap: options.bootstrap,
		context: {
			documentRoot,
			rootElement,
			shouldHydrate,
		},
	});

	const documentState = readRadiantDocumentStateFromDom(documentRoot);

	if (documentState) {
		await ensureRadiantAssets(documentState.state);
	} else {
		await loadRadiantDomModules(documentRoot);
	}

	const root = createRoot(rootElement);
	const renderApp = () => {
		const app = preparedApp.app;

		if (shouldHydrate) {
			root.hydrate(app);
			return;
		}

		root.render(app);
	};

	renderApp();

	if (!documentState) {
		await loadRadiantDomModules(rootElement);
	}

	startControllers(documentRoot);
	await preparedApp.onStarted?.();

	return root;
}

function resolveRadiantAppRoot<AppProps>(
	options: StartRadiantAppOptions<AppProps>,
	documentRoot: Document,
): HTMLElement {
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
