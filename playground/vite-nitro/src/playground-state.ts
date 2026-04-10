import type { JsxRenderable } from '@ecopages/jsx';
import type { RenderedComponentPayload } from '@ecopages/radiant/server/render-component';
import { createSsrStateScriptNode, readSsrStateFromDom, serializeSsrState } from '../vite-plugin-radiant/ssr-state';

export const PLAYGROUND_STATE_ATTRIBUTE = 'data-playground-state';
export const playgroundInitialComponent = 'counter' as const;

export type PlaygroundState = {
	clicks: number;
	ssrGeneratedAt: string;
	ssrMarkup: string;
	ssrStatus: 'idle' | 'loading' | 'ready' | 'error';
	ssrTagName: string;
	status: 'idle' | 'loading' | 'ready' | 'error';
	message: string;
	serverTime: string;
};

let _state: PlaygroundState | undefined;

export function setPlaygroundState(state: PlaygroundState): void {
	_state = state;
}

export function usePlaygroundState(): PlaygroundState {
	if (!_state) {
		throw new Error('Playground state not initialized. Call setPlaygroundState first.');
	}

	return _state;
}

export function createInitialPlaygroundState(initialSsrPayload?: RenderedComponentPayload): PlaygroundState {
	return {
		clicks: 0,
		ssrGeneratedAt: initialSsrPayload?.generatedAt ?? 'n/a',
		ssrMarkup: initialSsrPayload?.markup ?? '',
		ssrStatus: initialSsrPayload ? 'ready' : 'idle',
		ssrTagName: initialSsrPayload?.tagName ?? 'radiant-component-counter',
		status: 'idle',
		message: 'Nitro endpoint has not been called yet.',
		serverTime: 'n/a',
	};
}

export function createPlaygroundStateScriptNode(state: PlaygroundState): JsxRenderable {
	return createSsrStateScriptNode(serializeSsrState(state), PLAYGROUND_STATE_ATTRIBUTE);
}

export function readPlaygroundStateFromDom(root: ParentNode = document) {
	return readSsrStateFromDom<PlaygroundState>(PLAYGROUND_STATE_ATTRIBUTE, root);
}
