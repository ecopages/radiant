// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { renderToString, withServerHydrationBindingState } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { withRadiantServerCustomElementRenderBridge } from '../../src/server/element-ssr/radiant-element-ssr-bridge';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { bindTo } from '../../src/decorators/bind-to';
import { prop } from '../../src/decorators/prop';

let childConstructions = 0;

@customElement('minimal-dom-light-child-test')
class MinimalDomLightChild extends RadiantElement {
	constructor() {
		super();
		childConstructions += 1;
	}

	@prop({ type: String, defaultValue: 'Label' })
	@bindTo({ ref: 'button', attr: 'aria-label' })
	label: string;
}

@customElement('minimal-dom-light-parent-test')
class MinimalDomLightParent extends RadiantElement {
	override render() {
		return (
			<section>
				<slot />
			</section>
		);
	}
}

describe('JSX children of nested hosts on the minimal DOM', () => {
	it('builds each nested host light DOM once, including under a nested SSR scope', () => {
		expect([MinimalDomLightChild, MinimalDomLightParent]).toBeDefined();

		const page = (
			<minimal-dom-light-parent-test>
				<minimal-dom-light-child-test>
					<button data-ref="button" type="button">
						Toggle &amp; more
					</button>
				</minimal-dom-light-child-test>
			</minimal-dom-light-parent-test>
		);

		const renders = [
			() => withRadiantServerCustomElementRenderBridge(() => renderToString(page)),
			() =>
				withRadiantServerCustomElementRenderBridge(() =>
					withServerHydrationBindingState({ nextBindingIndex: 0 }, () => renderToString(page)),
				),
		];

		for (const render of renders) {
			childConstructions = 0;
			const html = render();
			expect(childConstructions, 'the nested host is built once').toBe(1);
			const buttons = html.match(/<button data-ref="button" type="button" aria-label="Label">/g) ?? [];
			expect(buttons, html).toHaveLength(1);
			expect(html).not.toMatch(/<button data-ref="button" type="button">/);
			expect(html).toContain('Toggle &amp; more</button>');
			expect(html).not.toContain('&amp;amp;');
		}
	});
});
