import { waitFor } from '@testing-library/dom';
import type { WritableSignal } from '@ecopages/signals';
import { beforeEach, describe, expect, test } from 'vitest';
import { installRadiantHydrator, uninstallRadiantHydrator } from '../../src/client/hydrator';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';
import { signal } from '../../src/decorators/signal';

@customElement('ssr-array-prop-hydrate-e2e')
class SsrArrayPropHydrateCard extends RadiantElement {
	@prop({ type: Array, defaultValue: [] }) items: Array<{ label: string }> = [];

	override render() {
		return <p>{this.items.length ? this.items.map((item) => item.label).join(', ') : 'empty'}</p>;
	}
}

@customElement('ssr-boolean-prop-hydrate-e2e')
class SsrBooleanPropHydrateCard extends RadiantElement {
	@prop({ type: Boolean, defaultValue: true }) enabled!: boolean;

	override render() {
		return <p>{String(this.enabled)}</p>;
	}
}

@customElement('signal-hydrate-e2e')
class SignalHydrateCard extends RadiantElement {
	@signal({ hydrate: String, initial: 'idle' }) status!: WritableSignal<string>;

	override render() {
		return <p data-ref="status">{this.status}</p>;
	}
}

const SSR_ARRAY_PROP_HOST_HTML =
	'<ssr-array-prop-hydrate-e2e items="[{&quot;label&quot;:&quot;first&quot;},{&quot;label&quot;:&quot;second&quot;}]"><p>first, second</p></ssr-array-prop-hydrate-e2e>';

const SSR_BOOLEAN_PROP_HOST_HTML =
	'<ssr-boolean-prop-hydrate-e2e enabled="false"><p>false</p></ssr-boolean-prop-hydrate-e2e>';

const SSR_SIGNAL_STATUS_HTML =
	'<signal-hydrate-e2e><script type="application/json" data-hydration data-hydration-type="signal" data-hydration-key="status">"ready"</script></signal-hydrate-e2e>';

describe('SSR hydrate in Chromium', () => {
	beforeEach(() => {
		uninstallRadiantHydrator();
		document.body.innerHTML = '';
	});

	test('hydrates array @prop values from SSR host attributes before the first client render', async () => {
		document.body.innerHTML = SSR_ARRAY_PROP_HOST_HTML;

		const element = document.querySelector('ssr-array-prop-hydrate-e2e') as SsrArrayPropHydrateCard;

		await waitFor(() => {
			expect(element.items).toEqual([{ label: 'first' }, { label: 'second' }]);
			expect(element.querySelector('p')?.textContent).toBe('first, second');
		});
	});

	test('hydrates an explicit false boolean @prop over a true default before the first client render', async () => {
		document.body.innerHTML = SSR_BOOLEAN_PROP_HOST_HTML;

		const element = document.querySelector('ssr-boolean-prop-hydrate-e2e') as SsrBooleanPropHydrateCard;

		await waitFor(() => {
			expect(element.enabled).toBe(false);
			expect(element.querySelector('p')?.textContent).toBe('false');
		});
	});

	test('hydrates signal state from keyed SSR payload scripts', async () => {
		installRadiantHydrator();
		document.body.innerHTML = SSR_SIGNAL_STATUS_HTML;
		const element = document.querySelector('signal-hydrate-e2e') as SignalHydrateCard | null;

		expect(element).not.toBeNull();

		await waitFor(() => {
			expect(element?.status.get()).toBe('ready');
		});
	});
});
