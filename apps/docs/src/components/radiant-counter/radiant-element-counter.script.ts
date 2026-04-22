import { RadiantElement, customElement, onEvent, onUpdated, prop, query } from '@ecopages/radiant';

export type RadiantElementCounterProps = {
	value?: number;
};

@customElement('radiant-element-counter')
export class RadiantElementCounter extends RadiantElement {
	@prop({ type: Number, reflect: true, defaultValue: 0 }) declare value: number;
	@query({ ref: 'count' }) countText!: HTMLSpanElement;

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

	@onUpdated('value')
	syncCount() {
		this.countText.textContent = String(this.value);
	}
}
