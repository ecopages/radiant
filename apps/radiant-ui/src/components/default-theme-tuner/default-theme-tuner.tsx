import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import './default-theme-tuner.script';

export const DefaultThemeTuner = eco.component<{}, JsxRenderable>({
	dependencies: {
		stylesheets: ['./default-theme-tuner.css'],
		scripts: ['./default-theme-tuner.script.tsx'],
	},
	render: () => <radiant-default-theme-tuner class="unstyled" />,
});
