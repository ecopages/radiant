import type { JSX_PROPS } from '@ecopages/jsx';
import { RadiantElement, bindTo, customElement, onEvent, prop } from '@ecopages/radiant';

export type RadiantElementCounterProps = {
	value?: number;
};

@customElement('radiant-element-counter')
export class RadiantElementCounter extends RadiantElement {
	declare readonly [JSX_PROPS]?: RadiantElementCounterProps;
	@prop({ type: Number, reflect: true, defaultValue: 0 })
	@bindTo({ ref: 'count', text: true })
	value!: number;

	@onEvent({ ref: 'decrement', type: 'click' })
	decrement() {
		if (this.value > 0) {
			this.value -= 1;
		}
	}

	@onEvent({ ref: 'increment', type: 'click' })
	increment() {
		this.value += 1;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'radiant-element-counter': RadiantElementCounter;
	}
}
