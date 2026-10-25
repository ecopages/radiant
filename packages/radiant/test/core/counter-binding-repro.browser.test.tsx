import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import { uninstallRadiantHydrator } from '../../src/client/hydrator';
import { prop } from '../../src/decorators/prop';
import { customElement } from '../../src/decorators/custom-element';
import { RadiantElement } from '../../src/core/radiant-element';

describe('counter binding repro', () => {
	@customElement('repro-counter-binding')
	class ReproCounterBinding extends RadiantElement<{ value: number }> {
		@prop({ type: Number, reflect: true, defaultValue: 0 }) value: number;

		private inc = () => {
			this.value += 1;
		};

		override render() {
			return (
				<>
					<button data-testid="inc-binding" on:click={this.inc}>
						+
					</button>
					<span data-testid="binding">{this.$.value}</span>
				</>
			);
		}
	}

	@customElement('repro-counter-plain')
	class ReproCounterPlain extends RadiantElement {
		@prop({ type: Number, reflect: true, defaultValue: 0 }) value: number;

		private inc = () => {
			this.value += 1;
		};

		override render() {
			return (
				<>
					<button data-testid="inc-plain" on:click={this.inc}>
						+
					</button>
					<span data-testid="plain">{this.value}</span>
				</>
			);
		}
	}

	beforeEach(() => {
		document.body.innerHTML = '';
		uninstallRadiantHydrator();
	});

	test('this.$.value binding updates on click', async () => {
		document.body.innerHTML = '<repro-counter-binding></repro-counter-binding>';
		const el = document.querySelector('repro-counter-binding') as ReproCounterBinding;
		await waitFor(() => expect(el.querySelector('[data-testid="binding"]')?.textContent).toBe('0'));
		(el.querySelector('[data-testid="inc-binding"]') as HTMLButtonElement).click();
		await waitFor(() => expect(el.querySelector('[data-testid="binding"]')?.textContent).toBe('1'));
	});

	test('this.value plain updates on click', async () => {
		document.body.innerHTML = '<repro-counter-plain></repro-counter-plain>';
		const el = document.querySelector('repro-counter-plain') as ReproCounterPlain;
		await waitFor(() => expect(el.querySelector('[data-testid="plain"]')?.textContent).toBe('0'));
		(el.querySelector('[data-testid="inc-plain"]') as HTMLButtonElement).click();
		await waitFor(() => expect(el.querySelector('[data-testid="plain"]')?.textContent).toBe('1'));
	});
});
