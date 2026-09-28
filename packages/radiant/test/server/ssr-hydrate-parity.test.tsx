import { beforeEach, describe, expect, test } from 'vitest';
import '../../src/server/install-ssr-runtime';
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
});
