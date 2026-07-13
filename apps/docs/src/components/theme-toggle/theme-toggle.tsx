import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSwitchProps } from '../switch/switch.script';
import './theme-toggle.script';

export const ThemeToggle = eco.component<RadiantSwitchProps, JsxRenderable>({
	dependencies: {
		stylesheets: ['../switch/switch.css'],
		scripts: ['./theme-toggle.script.ts'],
	},
	render: (props) => {
		return <theme-toggle class="radiant-switch" {...props} />;
	},
});
