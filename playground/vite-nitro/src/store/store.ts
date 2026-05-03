import type { JsxRenderable } from '@ecopages/jsx';
import type { RenderedComponentAsset, RenderedComponentPayload } from '@ecopages/radiant/server/render-component';
import { createStore, state, type SignalStore } from '@ecopages/signals';
import { createSsrStateScriptNode, readSsrStateFromDom, serializeSsrState } from '../lib/ssr-state';

export const APP_STATE_SCRIPT_ID = 'app-state';

export type AppState = {
	clicks: number;
	message: string;
	serverTime: string;
	status: 'idle' | 'loading' | 'ready' | 'error';
	ssrAssets: readonly RenderedComponentAsset[];
	ssrGeneratedAt: string;
	ssrLoadingEndpoint: string;
	ssrMarkup: string;
	ssrStatus: 'idle' | 'loading' | 'ready' | 'error';
	ssrTagName: string;
};

export type AppStore = SignalStore<AppState>;

const currentStore = state<AppStore | undefined>(undefined);

export function createAppStore(initialState?: AppState | RenderedComponentPayload): AppStore {
	return createStore(createInitialState(initialState));
}

export function setAppStore(store: AppStore): void {
	currentStore.set(store);
}

export function useAppStore(): AppStore {
	const store = currentStore.get();

	if (!store) {
		throw new Error('App store not initialized. Call setAppStore first.');
	}

	return store;
}

export function createInitialState(initialState?: AppState | RenderedComponentPayload): AppState {
	if (isAppState(initialState)) {
		return { ...initialState };
	}

	return {
		clicks: 0,
		message: 'Nitro endpoint has not been called yet.',
		serverTime: 'n/a',
		status: 'idle',
		ssrAssets: initialState?.assets ?? [],
		ssrGeneratedAt: initialState?.generatedAt ?? 'n/a',
		ssrLoadingEndpoint: '',
		ssrMarkup: initialState?.markup ?? '',
		ssrStatus: initialState ? 'ready' : 'idle',
		ssrTagName: initialState?.tagName ?? 'radiant-counter',
	};
}

function isAppState(value: AppState | RenderedComponentPayload | undefined): value is AppState {
	return Boolean(value && 'clicks' in value);
}

export function createStateScriptNode(store: AppState): JsxRenderable {
	return createSsrStateScriptNode(serializeSsrState(store), APP_STATE_SCRIPT_ID);
}

export function readStateFromDom(root: ParentNode = document) {
	return readSsrStateFromDom<AppState>(APP_STATE_SCRIPT_ID, root);
}
