import { eco } from '@ecopages/core';
import type { RadiantCounterProps } from './radiant-jsx-counter.script';
import './radiant-jsx-counter.script';

export const RadiantJsxCounter = eco.component({
	dependencies: {
		scripts: ['./radiant-jsx-counter.script.tsx'],
		stylesheets: ['./radiant-counter.css'],
	},
	render(props: RadiantCounterProps) {
		return <radiant-counter value={props.value}></radiant-counter>;
	},
});
