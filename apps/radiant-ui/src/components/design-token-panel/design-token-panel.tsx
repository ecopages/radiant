import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import './design-token-panel.script';

export const DesignTokenPanel = eco.component<{}, JsxRenderable>({
	dependencies: {
		stylesheets: ['./design-token-panel.css'],
		scripts: ['./design-token-panel.script.tsx'],
	},
	render: () => <radiant-design-token-panel class="unstyled" />,
});
