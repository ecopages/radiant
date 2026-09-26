// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { prop } from '../../src/decorators/prop';
import { withRadiantServerCustomElementRenderBridge } from '../../src/server/element-ssr/radiant-element-ssr-bridge';

@customElement('ssr-update-cycle-focus-host')
class SsrUpdateCycleFocusHost extends RadiantElement {
	@prop({ type: Boolean, defaultValue: true })
	open = true;

	@onUpdated('open')
	onOpen(): void {
		queueMicrotask(() => this.focus());
	}
}

describe('UpdateCycle SSR', () => {
	it('does not auto-flush @onUpdated into focus() after serialize', async () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(<ssr-update-cycle-focus-host open={true} />),
		);
		expect(html).toContain('ssr-update-cycle-focus-host');
		await Promise.resolve();
	});
});
