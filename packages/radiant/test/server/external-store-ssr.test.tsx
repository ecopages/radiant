// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { fromExternalStore } from '@ecopages/signals';
import { describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { renderComponentToString } from '../../src/server/render-component';

describe('fromExternalStore during server rendering', () => {
	test('paints getServerSnapshot and leaves the store unsubscribed', async () => {
		const listeners = new Set<() => void>();
		const store = {
			getSnapshot: () => 'client',
			getServerSnapshot: () => 'server',
			listenerCount: () => listeners.size,
			subscribe(listener: () => void) {
				listeners.add(listener);
				return () => listeners.delete(listener);
			},
		};

		@customElement('external-store-ssr-host')
		class Host extends RadiantElement<{ label: string }> {
			constructor() {
				super();
				this.registerReactiveMember('label', fromExternalStore(store));
			}

			override render() {
				return <p data-ref="label">{this.$.label}</p>;
			}
		}

		const html = await renderComponentToString(Host);

		expect(html).toContain('server');
		expect(html).not.toContain('client');
		expect(store.listenerCount()).toBe(0);
	});
});
