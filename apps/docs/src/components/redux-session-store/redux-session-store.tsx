import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import './redux-session-store.script';

export const ReduxSessionStore = eco.component<{}, JsxRenderable>({
	dependencies: {
		scripts: ['./redux-session-store.script.tsx'],
	},
	render: () => <radiant-redux-demo></radiant-redux-demo>,
});
