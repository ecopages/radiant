import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSwitchProps } from './switch.script';
import './switch.script';

export const RadiantSwitch = eco.component<RadiantSwitchProps, JsxRenderable>({
	dependencies: {
		stylesheets: ['./switch.css'],
		scripts: ['./switch.script.tsx'],
	},
	render: (props) => {
		return <radiant-switch class="radiant-switch" {...props} />;
	},
});
