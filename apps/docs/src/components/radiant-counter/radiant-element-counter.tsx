import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantElementCounterProps } from './radiant-element-counter.script';

export const RadiantElementCounter = eco.component<RadiantElementCounterProps, JsxRenderable>({
	dependencies: {
		scripts: ['./radiant-element-counter.script.ts'],
		stylesheets: ['./radiant-counter.css'],
	},
	render: ({ value }) => {
		return (
			<radiant-element-counter value={value}>
				<button type="button" data-ref="decrement" aria-label="Decrement">
					-
				</button>
				<span data-ref="count">{value ?? 0}</span>
				<button type="button" data-ref="increment" aria-label="Increment">
					+
				</button>
			</radiant-element-counter>
		);
	},
});
