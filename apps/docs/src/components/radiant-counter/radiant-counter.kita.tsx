import type { RadiantCounterProps } from './radiant-counter.script';

export const RadiantCounter = ({ value }: RadiantCounterProps) => {
	return (
		<radiant-counter value={value}>
			<button type="button" data-ref="decrement" aria-label="Decrement">
				-
			</button>
			<span data-ref="count">{value}</span>
			<button type="button" data-ref="increment" aria-label="Increment">
				+
			</button>
		</radiant-counter>
	);
};

RadiantCounter.config = {
	dependencies: {
		scripts: ['./radiant-counter.script.ts'],
		stylesheets: ['./radiant-counter.css'],
	},
};
