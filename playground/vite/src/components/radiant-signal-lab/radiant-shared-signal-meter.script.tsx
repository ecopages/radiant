import type { WritableSignal } from '@ecopages/signals';
import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { onUpdated } from '@ecopages/radiant/decorators/on-updated';
import { signal } from '@ecopages/radiant/decorators/signal';
import { sharedSignalMeterCount } from './radiant-signal-lab.store';

@customElement('radiant-shared-signal-meter')
export class RadiantSharedSignalMeter extends RadiantElement<{ count: number }> {
	@signal({ bind: true, source: sharedSignalMeterCount }) count!: WritableSignal<number>;

	override connectedCallback(): void {
		super.connectedCallback();
		this.syncCount();
	}

	@onEvent({ ref: 'decrement', type: 'click' })
	decrement(): void {
		this.count.update((value) => Math.max(0, value - 1));
	}

	@onEvent({ ref: 'increment', type: 'click' })
	increment(): void {
		this.count.update((value) => value + 1);
	}

	@onUpdated('count')
	syncCount(): void {
		const nextValue = String(this.count.get());
		this.getRef<HTMLElement>('count').textContent = nextValue;
		this.getRef<HTMLElement>('binding').textContent = `$.count -> ${this.$.count.getValue()}`;
	}
}
