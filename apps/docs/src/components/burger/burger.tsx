import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';

export const Burger = eco.component<{ class?: string }, JsxRenderable>({
	dependencies: {
		stylesheets: ['./burger.css'],
		scripts: ['./burger.script.tsx'],
	},
	render: ({ class: className }) => {
		return (
			<span class={className}>
				<radiant-burger class="burger-host" />
			</span>
		);
	},
});
