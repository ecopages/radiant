import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, bindTo, customElement, onEvent, prop } from '@ecopages/radiant';

export type RadiantElementCounterProps = {
	value?: number;
};

@customElement('radiant-element-counter')
export class RadiantElementCounter extends RadiantElement {
	@prop({ type: Number, reflect: true, defaultValue: 0 })
	@bindTo({ ref: 'count', text: true })
	declare value: number;

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

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'radiant-element-counter': JsxCustomElementAttributes<RadiantElementCounter, RadiantElementCounterProps>;
	}
}
