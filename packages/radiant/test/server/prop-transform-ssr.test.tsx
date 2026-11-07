// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import type { JSX_PROPS } from '@ecopages/jsx';
import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';
import { withRadiantServerCustomElementRenderBridge } from '../../src/server/radiant-element-ssr';

declare global {
	interface HTMLElementTagNameMap {
		'ssr-list-prop-test': SsrListProp;
	}
}

@customElement('ssr-list-prop-test')
class SsrListProp extends RadiantElement {
	declare readonly [JSX_PROPS]?: { value?: string[] };

	@prop({
		type: Array,
		reflect: true,
		transform: {
			fromAttribute: (value: string | null) => (value ? value.split(',') : []),
			toAttribute: (values: string[]) => (values.length > 0 ? values.join(',') : null),
		},
	})
	value: string[] = [];
}

function render(value: string[]): string {
	return withRadiantServerCustomElementRenderBridge(() =>
		renderToString(<ssr-list-prop-test value={value} />, { mode: 'hydrate' }),
	);
}

describe('server host attributes for props with a transform', () => {
	test('omits an empty list instead of reflecting "[]"', () => {
		expect(render([])).not.toMatch(/\svalue=/);
	});

	test('writes a list through the transform', () => {
		expect(render(['a', 'b'])).toContain('value="a,b"');
	});
});
