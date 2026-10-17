// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { jsx } from '@ecopages/jsx';
import { renderServerLightDom, renderToString, withServerHydrationBindingState } from '@ecopages/jsx/server';
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

describe('renderServerLightDom edge cases', () => {
	it('keeps children of every text-only element, not just script and textarea', () => {
		for (const tag of ['iframe', 'xmp', 'noembed', 'noframes'] as const) {
			const host = document.createElement('div');
			host.replaceChildren(...renderServerLightDom(jsx(tag, { children: 'Hello <b>' }), document));

			expect(host.innerHTML).not.toContain('radiant-ssr-part');
			expect(host.textContent).toBe('Hello <b>');
		}
	});

	it('stays correct once more template shapes than the cache holds have been rendered', () => {
		const render = (name: string) => {
			const host = document.createElement('div');
			host.replaceChildren(...renderServerLightDom(jsx('div', { [name]: 'v', children: 'x' }), document));
			return host.innerHTML;
		};

		for (let index = 0; index < 1100; index++) {
			expect(render(`data-shape-${index}`)).toBe(`<div data-shape-${index}="v">x</div>`);
		}

		expect(render('data-shape-0')).toBe('<div data-shape-0="v">x</div>');
	});
});
