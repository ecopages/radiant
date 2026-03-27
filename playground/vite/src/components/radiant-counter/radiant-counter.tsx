import type { RadiantCounterProps } from './radiant-counter.script';
import './radiant-counter.script';
import './radiant-counter.css';

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
			<p data-ref="status" style="display:none;">
				Waiting for input
			</p>
		</radiant-counter>
	);
};
