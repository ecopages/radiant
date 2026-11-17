// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import type { JSX_PROPS } from '@ecopages/jsx';
import { renderToString } from '@ecopages/jsx/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';
import { withRadiantServerCustomElementRenderBridge } from '../../src/server/radiant-element-ssr';

declare global {
	interface HTMLElementTagNameMap {
		'ssr-function-prop-a-test': SsrFunctionPropA;
		'ssr-function-prop-b-test': SsrFunctionPropB;
	}
}

@customElement('ssr-function-prop-a-test')
class SsrFunctionPropA extends RadiantElement {
	declare readonly [JSX_PROPS]?: { cfg?: unknown };

	@prop({ type: Object, reflect: true }) cfg: unknown;
}

@customElement('ssr-function-prop-b-test')
class SsrFunctionPropB extends RadiantElement {
	declare readonly [JSX_PROPS]?: { cfg?: unknown };

	@prop({ type: Object, reflect: true }) cfg: unknown;
}

describe('server render of an Object prop that holds a function', () => {
	afterEach(() => vi.restoreAllMocks());

	test('each tag emits one skip warning that names it, and writes no attribute', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const cfg = () => 'secret source';

		const markup = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<>
					<ssr-function-prop-a-test cfg={cfg} />
					<ssr-function-prop-b-test cfg={cfg} />
				</>,
				{ mode: 'hydrate' },
			),
		);

		const messages = warn.mock.calls.map((call) => String(call[0]));
		expect(markup).not.toContain('cfg=');
		expect(markup).not.toContain('secret source');
		expect(messages).toHaveLength(2);
		expect(messages.filter((message) => message.includes('"cfg" of <ssr-function-prop-a-test>'))).toHaveLength(1);
		expect(messages.filter((message) => message.includes('"cfg" of <ssr-function-prop-b-test>'))).toHaveLength(1);
	});
});
