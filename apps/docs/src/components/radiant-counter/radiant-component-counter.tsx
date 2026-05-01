import { eco } from '@ecopages/core';
import type { RadiantCounterProps } from './radiant-component-counter.script';
import './radiant-component-counter.script';

export const RadiantJsxCounter = eco.component({
	dependencies: {
		scripts: ['./radiant-component-counter.script.tsx'],
		stylesheets: ['./radiant-counter.css'],
	},
	render(props: RadiantCounterProps) {
		return <radiant-counter prop:value={props.value}></radiant-counter>;
	},
});
