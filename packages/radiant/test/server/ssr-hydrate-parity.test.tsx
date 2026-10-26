import { beforeEach, describe, expect, test } from 'vitest';
import '../../src/server/install-ssr-runtime';
import { jsx } from '@ecopages/jsx';
import { renderToString } from '@ecopages/jsx/server';
import { RadiantElement } from '../../src/core/radiant-element';
import { registerSsrPreparationCallback } from '../../src/core/ssr-preparation';
import { customElement } from '../../src/decorators/custom-element';
import { createServerRenderEnvironment, installLightDomShim } from '../../src/server/light-dom-shim';
import { renderRadiantElementHostToString } from '../../src/server/radiant-element-ssr';

describe('SSR hydrate parity (minimal-dom)', () => {
	beforeEach(() => {
		installLightDomShim();
	});

	test('serializes sync preparation state but not deferred rAF work', () => {
		@customElement('ssr-parity-raf-host')
		class SsrParityRafHost extends RadiantElement {
			constructor() {
				super();
				registerSsrPreparationCallback(this, () => {
					this.setAttribute('data-sync', 'ready');
					requestAnimationFrame(() => {
						this.setAttribute('data-layout', 'done');
					});
				});
			}

			override render() {
				return <p data-ref="label">parity</p>;
			}
		}

		const environment = createServerRenderEnvironment();
		const element = new SsrParityRafHost();
		environment.prepareHost(element);

		const html = renderRadiantElementHostToString(element, { mode: 'hydrate' });

		expect(html).toContain('data-sync="ready"');
		expect(html).toContain('parity');
		expect(html).not.toContain('data-layout');
	});

	test('resolves registered third-party JSX classes through the SSR registry name', () => {
		class ThirdPartyCard extends HTMLElement {}
		const tagName = 'radiant-jsx-server-third-party-card';
		customElements.define(tagName, ThirdPartyCard);
		const props = { id: 'server', children: 'Third party' };

		expect(renderToString(jsx(ThirdPartyCard, props))).toBe(renderToString(jsx(tagName, props)));
		expect(renderToString(jsx(ThirdPartyCard, props))).toBe(
			'<radiant-jsx-server-third-party-card id="server">Third party</radiant-jsx-server-third-party-card>',
		);
	});
});
