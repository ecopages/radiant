import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { onUpdated } from '@ecopages/radiant/decorators/on-updated';
import { query } from '@ecopages/radiant/decorators/query';
import { reactiveProp } from '@ecopages/radiant/decorators/reactive-prop';
import { state } from '@ecopages/radiant/decorators/state';

export type RadiantCounterProps = {
	value?: number;
};

type RadiantCounterBindings = RadiantCounterProps & {
	lastAction: string;
};

@customElement('radiant-counter')
export class RadiantCounter extends RadiantElement<RadiantCounterBindings> {
	@reactiveProp({ type: Number, reflect: true, defaultValue: 0 }) value!: number;
	@state lastAction = 'Waiting for input';
	@query({ ref: 'count' }) countText!: HTMLElement;
	@query({ ref: 'status' }) statusText!: HTMLElement;

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
		this.countText.textContent = this.value.toString();
	}

	@onUpdated('lastAction')
	updateStatus() {
		this.statusText.textContent = this.lastAction;
	}
}

declare global {
}
