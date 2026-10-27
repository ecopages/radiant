import type { JSX_PROPS } from '@ecopages/jsx';
import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { onUpdated } from '@ecopages/radiant/decorators/on-updated';
import { query } from '@ecopages/radiant/decorators/query';
import { prop } from '@ecopages/radiant/decorators/prop';
import { state } from '@ecopages/radiant/decorators/state';

export type RadiantCounterProps = {
	value?: number;
};

type RadiantCounterBindings = RadiantCounterProps & {
	lastAction: string;
};

@customElement('radiant-counter')
export class RadiantCounter extends RadiantElement<RadiantCounterBindings> {
	declare readonly [JSX_PROPS]?: RadiantCounterProps;
	@prop({ type: Number, reflect: true, defaultValue: 0 }) value!: number;
	@state lastAction = 'Waiting for input';
	@query({ ref: 'count' }) countText!: HTMLElement | null;
	@query({ ref: 'status' }) statusText!: HTMLElement | null;

	@onEvent({ ref: 'decrement', type: 'click' })
	decrement() {
		if (this.value > 0) {
			this.value--;
			this.lastAction = 'Decremented';
		}
	}

	@onEvent({ ref: 'increment', type: 'click' })
	increment() {
		this.value++;
		this.lastAction = 'Incremented';
	}

	@onUpdated('value')
	updateCount() {
		if (this.countText) this.countText.textContent = this.value.toString();
	}

	@onUpdated('lastAction')
	updateStatus() {
		if (this.statusText) this.statusText.textContent = this.lastAction;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'radiant-counter': RadiantCounter;
	}
}
