import type { WritableSignal } from '@ecopages/signals';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { signal } from '../../src/decorators/signal';

/** Shared by the client `@signal` tests and the SSR ones. */
@customElement('signal-component-test')
export class SignalComponent extends RadiantElement<{ count: number }> {
	@signal({ initial: 1 }) count!: WritableSignal<number>;
	@signal({ hydrate: String, initial: 'idle' }) status!: WritableSignal<string>;

	@onUpdated('count')
	handleCountUpdated() {
		this.setAttribute('data-updated-count', String(this.count.get()));
	}

	override render() {
		return (
			<section>
				<button data-ref="action" disabled={this.status} data-status={this.status}>
					Count: {this.count}
				</button>
				<p data-ref="status-label">{this.status.get() === 'loading' ? 'Loading' : 'Idle'}</p>
				<p data-ref="binding">Binding: {this.$.count}</p>
			</section>
		);
	}
}
