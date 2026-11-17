import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import './external-store-cart.script';

export const ExternalStoreCart = eco.component<{}, JsxRenderable>({
	dependencies: {
		scripts: ['./external-store-cart.script.tsx'],
	},
	render: () => <radiant-cart-demo></radiant-cart-demo>,
});
