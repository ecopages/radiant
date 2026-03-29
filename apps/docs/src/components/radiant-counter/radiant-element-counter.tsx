import type { RadiantElementCounterProps } from './radiant-element-counter.script';

export const RadiantElementCounter = ({ value }: RadiantElementCounterProps) => {
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
};

RadiantElementCounter.config = {
	dependencies: {
		scripts: ['./radiant-element-counter.script.ts'],
		stylesheets: ['./radiant-counter.css'],
	},
};
