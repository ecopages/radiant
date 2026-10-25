// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import type { JsxCustomElementAttributes, JsxRenderable } from '@ecopages/jsx';
import { renderToString } from '@ecopages/jsx/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { state } from '../../src/decorators/state';
import {
	renderRadiantElementHostToString,
	withRadiantServerCustomElementRenderBridge,
} from '../../src/server/radiant-element-ssr';

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'ssr-value-frame-test': JsxCustomElementAttributes<
			SsrValueFrame,
			{ children?: JsxRenderable; header?: JsxRenderable }
		>;
		'ssr-value-badge-test': JsxCustomElementAttributes<SsrValueBadge>;
		'ssr-value-shell-test': JsxCustomElementAttributes<SsrValueShell, { children?: JsxRenderable }>;
	}
}

@customElement('ssr-value-shell-test')
class SsrValueShell extends RadiantElement {}

@customElement('ssr-value-frame-test')
class SsrValueFrame extends RadiantElement {
	@state header: JsxRenderable = null;

	override render() {
		return (
			<div class="frame">
				<header>{this.header}</header>
				<main>
					<slot>
						<em class="fallback">empty</em>
					</slot>
				</main>
			</div>
		);
	}
}

@customElement('ssr-value-badge-test')
class SsrValueBadge extends RadiantElement<{ label: string }> {
	@state label = 'badge';

	override render() {
		return <b class="badge">{this.$.label}</b>;
	}
}

@customElement('ssr-value-parent-test')
class SsrValueParent extends RadiantElement {
	@state variant: 'children' | 'empty' | 'named' | 'region' | 'shell' = 'children';

	override render() {
		switch (this.variant) {
			case 'empty':
				return <ssr-value-frame-test>{null}</ssr-value-frame-test>;
			case 'named':
				return (
					<ssr-value-frame-test>
						<h2 slot="header">Title</h2>
						<p>Body</p>
					</ssr-value-frame-test>
				);
			case 'shell':
				return (
					<ssr-value-shell-test>
						<ssr-value-frame-test>
							<p>Body</p>
						</ssr-value-frame-test>
					</ssr-value-shell-test>
				);
			case 'region':
				return (
					<ssr-value-frame-test header={<h2>Title</h2>}>
						<p>Body</p>
					</ssr-value-frame-test>
				);
			default:
				return (
					<ssr-value-frame-test>
						<p title={this.variant}>Body</p>
						<ssr-value-badge-test />
					</ssr-value-frame-test>
				);
		}
	}
}

function renderParent(variant: SsrValueParent['variant']): string {
	const parent = new SsrValueParent();
	parent.variant = variant;
	return renderRadiantElementHostToString(parent, { mode: 'hydrate' });
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('a render-owning host in a view, on the server', () => {
	test('renders the JSX children in its slot, in its own marker namespace, without a slot payload', () => {
		const html = renderParent('children');

		expect(html).toContain(
			'<main><p data-radiant-jsx-bind-1="attr:title" title="children">Body</p><ssr-value-badge-test data-radiant-ssr><b data-radiant-jsx-bind-0="attr:class" class="badge">badge</b>',
		);
		expect(html).not.toContain('data-radiant-slot-projection');
		expect(html).not.toContain('fallback');
	});

	test('takes the value and the stamp in hydrate mode only, and Authored Children with a payload in plain mode', () => {
		const parent = new SsrValueParent();
		parent.variant = 'children';
		const plain = renderRadiantElementHostToString(parent, { mode: 'plain' });

		expect(renderParent('children')).toContain('<ssr-value-frame-test data-radiant-ssr="children">');
		expect(plain).toContain('<ssr-value-frame-test><div class="frame">');
		expect(plain).toContain('data-radiant-slot-projection');
		expect(plain).not.toContain('data-radiant-ssr');
	});

	test('renders the slot fallback for empty children', () => {
		const html = renderParent('empty');

		expect(html).toMatch(/<main><em [^>]*class="fallback">empty<\/em><\/main>/);
		expect(html).not.toContain('data-radiant-slot-projection');
	});

	test('keeps a child marked with a slot name in the default slot and warns', () => {
		const html = renderParent('named');

		expect(html).toContain('<header></header><main><h2');
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('slot="header"; pass it as the header property'));
	});

	test('renders a named region passed as an unprefixed property', () => {
		expect(renderParent('region')).toMatch(/<header><h2>Title<\/h2><\/header><main><p>Body<\/p><\/main>/);
	});
});

describe('a render-owning host among the JSX children of a host without render(), in a view, on the server', () => {
	test('takes its JSX children as a value, as the view creates it on the client', () => {
		const html = renderParent('shell');

		expect(html).toContain(
			'<ssr-value-shell-test data-radiant-ssr><ssr-value-frame-test data-radiant-ssr="children">',
		);
		expect(html).toContain('<main><p>Body</p></main></div></ssr-value-frame-test>');
	});
});

describe('a render-owning host outside any view, on the server', () => {
	test('takes its JSX children as HTML and ships them in the slot payload', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<ssr-value-frame-test>
					<p>Body</p>
				</ssr-value-frame-test>,
				{ mode: 'hydrate' },
			),
		);

		expect(html).toContain('<main><p>Body</p></main>');
		expect(html).toContain(
			'<script type="application/json" data-radiant-slot-projection>{"":["\\u003cp>Body\\u003c/p>"]}',
		);
	});

	test('takes an empty string child without warning that the tag was defined late', () => {
		withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<ssr-value-frame-test>
					{''}
					<p>Body</p>
				</ssr-value-frame-test>,
			),
		);

		expect(warn).not.toHaveBeenCalled();
	});

	test('passes its JSX children to a nested render-owning host as HTML too', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<ssr-value-frame-test>
					<ssr-value-frame-test>
						<p>Body</p>
					</ssr-value-frame-test>
				</ssr-value-frame-test>,
				{ mode: 'hydrate' },
			),
		);

		expect(html).toContain(
			'<main><p>Body</p></main></div><script type="application/json" data-radiant-slot-projection>{"":["\\u003cp>Body\\u003c/p>"]}</script></ssr-value-frame-test>',
		);
	});
});
