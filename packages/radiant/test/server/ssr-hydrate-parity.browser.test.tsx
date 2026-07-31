import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import { installRadiantHydrator, uninstallRadiantHydrator } from '../../src/client/hydrator';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';

@customElement('ssr-parity-raf-host')
class SsrParityRafHost extends RadiantElement {
	override connectedCallback(): void {
		super.connectedCallback();
		this.setAttribute('data-sync', 'ready');
		requestAnimationFrame(() => {
			this.setAttribute('data-layout', 'done');
		});
	}

	override render() {
		return <p data-ref="label">parity</p>;
	}
}

const SSR_PARITY_MARKUP =
	'<ssr-parity-raf-host data-sync="ready"><p data-ref="label">parity</p></ssr-parity-raf-host>';

describe('SSR hydrate parity in browser', () => {
	beforeEach(() => {
		uninstallRadiantHydrator();
		document.body.innerHTML = '';
	});

	test('hydrates SSR sync markup and applies deferred client layout work', async () => {
		installRadiantHydrator();
		document.body.innerHTML = SSR_PARITY_MARKUP;

		const host = document.querySelector('ssr-parity-raf-host') as SsrParityRafHost | null;
		expect(host).not.toBeNull();
		expect(host?.getAttribute('data-sync')).toBe('ready');
		expect(host?.querySelector('[data-ref="label"]')?.textContent).toBe('parity');

		await waitFor(() => {
			expect(host?.getAttribute('data-layout')).toBe('done');
		});
	});
});
