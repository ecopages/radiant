// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { fromExternalStore } from '@ecopages/signals';
import { describe, expect, test } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { controller } from '../../src/decorators/controller';
import { customElement } from '../../src/decorators/custom-element';
import { fromStore } from '../../src/decorators/from-store';
import { onUpdated } from '../../src/decorators/on-updated';
import { renderComponentToString } from '../../src/server/render-component';
import { renderControllerToString } from '../../src/server/render-controller';

/** A browser-only store: its client read and its subscribe throw, as `localStorage` or `matchMedia` would on the server. */
function createBrowserOnlyStore() {
	return {
		getSnapshot: (): string => {
			throw new Error('getSnapshot read on the server');
		},
		getServerSnapshot: () => 'server',
		subscribe: (): (() => void) => {
			throw new Error('subscribed on the server');
		},
	};
}

describe('fromExternalStore during server rendering', () => {
	test('a registered member paints getServerSnapshot without reading or subscribing to the client store', async () => {
		const store = createBrowserOnlyStore();

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

		expect(html).toContain('>server</p>');
	});

	test('@fromStore on an element paints getServerSnapshot, and @onUpdated sees no client value', async () => {
		const store = createBrowserOnlyStore();
		const updates: string[] = [];

		@customElement('from-store-ssr-host')
		class Host extends RadiantElement<{ label: string }> {
			@fromStore(store)
			label!: string;

			@onUpdated('label')
			onLabel() {
				updates.push(this.label);
			}

			override render() {
				return <p data-ref="label">{this.$.label}</p>;
			}
		}

		expect(customElements.get('from-store-ssr-host')).toBe(Host);

		const html = await renderComponentToString(Host);

		expect(html).toContain('>server</p>');
		expect(updates).toEqual([]);
	});

	test('@fromStore on a controller paints getServerSnapshot although the server render connects it', async () => {
		const store = createBrowserOnlyStore();

		@controller('from-store-ssr-controller')
		class Label extends RadiantController<{ label: string }> {
			@fromStore(store)
			label!: string;

			override render() {
				return <p>{this.$.label}</p>;
			}
		}

		const html = await renderControllerToString(Label, { tagName: 'section' });

		expect(html).toContain('<p>server</p>');
	});
});
