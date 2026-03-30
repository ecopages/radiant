import { waitFor } from '@testing-library/dom';
import { state as createSignalState, type WritableSignal } from '@ecopages/signals';
import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantComponent } from '../../src/core/radiant-component';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { signal } from '../../src/decorators/signal';

declare const __LEGACY_ENVIRONMENT__: boolean;

const describeWhenStandard = __LEGACY_ENVIRONMENT__ ? describe.skip : describe;
const sharedSignalElementCount = createSignalState(2);

@customElement('shared-signal-element-test')
class SharedSignalElement extends RadiantElement<{ count: number }> {
	@signal({ bind: true, source: sharedSignalElementCount }) count!: WritableSignal<number>;

	override connectedCallback(): void {
		super.connectedCallback();
		this.syncCount();
	}

	@onUpdated('count')
	syncCount() {
		this.getRef<HTMLElement>('count').textContent = String(this.count.get());
		this.getRef<HTMLElement>('binding').textContent = String(this.$.count.getValue());
	}
}

describe('@signal', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		sharedSignalElementCount.set(2);
	});

	@customElement('plain-signal-element-test')
	class PlainSignalElement extends RadiantElement {
		@signal({ initial: 1 }) count!: WritableSignal<number>;

		updates = 0;

		override connectedCallback() {
			super.connectedCallback();
			this.registerUpdateCallback('count', () => {
				this.updates += 1;
			});
		}
	}

	@customElement('signal-component-test')
	class SignalComponent extends RadiantComponent<{ count: number }> {
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

	test('creates a writable signal field that notifies Radiant update callbacks', async () => {
		const element = document.createElement('plain-signal-element-test') as PlainSignalElement;
		document.body.appendChild(element);

		expect(element.count.get()).toBe(1);
		element.count.set(2);

		await waitFor(() => {
			expect(element.count.get()).toBe(2);
			expect(element.updates).toBe(1);
		});
	});

	test('renders direct signal children and attributes without an imperative sync step', async () => {
		const element = document.createElement('signal-component-test') as SignalComponent;
		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.querySelector('[data-ref="action"]')?.textContent).toContain('Count: 1');
			expect(element.querySelector('[data-ref="binding"]')?.textContent).toContain('Binding: 1');
		});

		element.count.set(4);
		element.status.set('loading');

		await waitFor(() => {
			const action = element.querySelector<HTMLButtonElement>('[data-ref="action"]');
			expect(action?.textContent).toContain('Count: 4');
			expect(action?.getAttribute('data-status')).toBe('loading');
			expect(action?.disabled).toBe(true);
			expect(element.querySelector('[data-ref="status-label"]')?.textContent).toBe('Loading');
			expect(element.querySelector('[data-ref="binding"]')?.textContent).toContain('Binding: 4');
			expect(element.getAttribute('data-updated-count')).toBe('4');
		});
	});

	test('hydrates signal state from keyed SSR payload scripts', async () => {
		document.body.innerHTML =
			'<signal-component-test><script type="application/json" data-hydration data-hydration-type="signal" data-hydration-key="status">"ready"</script></signal-component-test>';
		const element = document.querySelector('signal-component-test') as SignalComponent | null;

		expect(element).not.toBeNull();

		await waitFor(() => {
			expect(element?.status.get()).toBe('ready');
		});
	});

	describeWhenStandard('pre-connect signal and SSR', () => {
		test('supports pre-connect signal reads and writes for host rendering', () => {
			const element = new SignalComponent();

			element.count.set(4);
			element.status.set('loading');

			const html = element.renderHostToString();

			expect(html).toContain('Count: 4');
			expect(html).toContain('Loading');
		});

		test('appends signal hydration scripts to SSR host output when requested', () => {
			const element = new SignalComponent();
			element.status.set('ready');
			const html = element.renderHostToString({ hydrate: true });

			expect(html).toContain('<signal-component-test>');
			expect(html).toContain(
				'<script type="application/json" data-hydration data-hydration-type="signal" data-hydration-key="status">"ready"</script>',
			);
		});
	});

	test('can connect a shared writable signal to a plain RadiantElement field', async () => {
		const element = document.createElement('shared-signal-element-test') as SharedSignalElement;
		element.innerHTML = '<p data-ref="count"></p><p data-ref="binding"></p>';
		document.body.appendChild(element);

		await waitFor(() => {
			expect(element.getRef<HTMLElement>('count').textContent).toBe('2');
			expect(element.getRef<HTMLElement>('binding').textContent).toBe('2');
		});

		sharedSignalElementCount.set(5);

		await waitFor(() => {
			expect(element.getRef<HTMLElement>('count').textContent).toBe('5');
			expect(element.getRef<HTMLElement>('binding').textContent).toBe('5');
		});

		element.count.set(7);

		await waitFor(() => {
			expect(sharedSignalElementCount.get()).toBe(7);
			expect(element.getRef<HTMLElement>('count').textContent).toBe('7');
		});
	});
});
