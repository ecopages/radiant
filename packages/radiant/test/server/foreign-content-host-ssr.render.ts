/**
 * Renders hosts placed inside `svg` or `math` with the Node SSR runtime (minimal DOM and the Radiant bridge), as a
 * server does, and writes the renders to stdout as JSON for a Chromium test to parse.
 */
import '../../src/server/install-ssr-runtime';
import { jsx, type JsxRenderable } from '@ecopages/jsx';
import { renderToString } from '@ecopages/jsx/server';
import { RadiantElement } from '../../src/core/radiant-element';
import { withRadiantServerCustomElementRenderBridge } from '../../src/server/element-ssr/radiant-element-ssr-bridge';
import type { ForeignContentHostRender } from './foreign-content-host-ssr';

/** Text that creates an `img` if a parser reads it as markup. */
const INJECTED = '<img id="pwn" src="x">';
/** CSS that must reach the browser byte for byte in HTML context. */
const RANGE_MEDIA_QUERY_CSS = '@media (width < 600px) { p { color: red } }';

function element(tag: string, children?: JsxRenderable): JsxRenderable {
	return jsx(tag, children === undefined ? {} : { children });
}

class LightHost extends RadiantElement {}

class SlotHost extends RadiantElement {
	override render() {
		return element('g', element('slot'));
	}
}

class StyleRenderHost extends RadiantElement {
	override render() {
		return element('style', INJECTED);
	}
}

class SvgParentHost extends RadiantElement {
	override render() {
		return element('svg', element('slot-host', element('xmp', INJECTED)));
	}
}

customElements.define('light-host', LightHost);
customElements.define('slot-host', SlotHost);
customElements.define('style-render-host', StyleRenderHost);
customElements.define('svg-parent-host', SvgParentHost);

function render(value: JsxRenderable, mode: 'plain' | 'hydrate'): string {
	return withRadiantServerCustomElementRenderBridge(() => renderToString(value, { mode }));
}

function lightDom(root: string, tag: string): JsxRenderable {
	return element(root, element('light-host', element(tag, INJECTED)));
}

const slotted = element('svg', element('g', element('slot-host', element('style', INJECTED))));

const foreignCases: Array<[name: string, value: JsxRenderable, mode: 'plain' | 'hydrate', tag: string]> = [
	['svg > host light DOM style, plain', lightDom('svg', 'style'), 'plain', 'style'],
	['svg > host light DOM style, hydrate', lightDom('svg', 'style'), 'hydrate', 'style'],
	['math > host light DOM noframes, plain', lightDom('math', 'noframes'), 'plain', 'noframes'],
	['svg > host own render() style, hydrate', element('svg', element('style-render-host')), 'hydrate', 'style'],
	['svg > host Children Value xmp from a view, hydrate', element('svg-parent-host'), 'hydrate', 'xmp'],
	['svg > g > slotted host style, plain', slotted, 'plain', 'style'],
	['svg > g > slotted host style, hydrate', slotted, 'hydrate', 'style'],
	['svg > host light DOM xmp, plain', lightDom('svg', 'xmp'), 'plain', 'xmp'],
	['math > host light DOM iframe, hydrate', lightDom('math', 'iframe'), 'hydrate', 'iframe'],
	[
		'svg > host > nested host light DOM noframes, plain',
		element('svg', element('light-host', element('light-host', element('noframes', INJECTED)))),
		'plain',
		'noframes',
	],
	[
		'host > svg > nested host light DOM style, plain',
		element('light-host', lightDom('svg', 'style')),
		'plain',
		'style',
	],
	[
		'math > desc > host light DOM style, plain',
		element('math', element('desc', element('light-host', element('style', INJECTED)))),
		'plain',
		'style',
	],
];

const htmlCases: Array<[name: string, value: JsxRenderable]> = [
	['host light DOM style in HTML, plain', element('light-host', element('style', RANGE_MEDIA_QUERY_CSS))],
	[
		'svg > title > host light DOM style, plain',
		element('svg', element('title', element('light-host', element('style', RANGE_MEDIA_QUERY_CSS)))),
	],
	[
		'svg > host > desc > nested host light DOM style, plain',
		element(
			'svg',
			element('light-host', element('desc', element('light-host', element('style', RANGE_MEDIA_QUERY_CSS)))),
		),
	],
];

const renders: ForeignContentHostRender[] = [
	...foreignCases.map(([name, value, mode, tag]) => ({
		name,
		html: render(value, mode),
		tag,
		text: INJECTED,
		foreign: true,
	})),
	...htmlCases.map(([name, value]) => ({
		name,
		html: render(value, 'plain'),
		tag: 'style',
		text: RANGE_MEDIA_QUERY_CSS,
		foreign: false,
	})),
];

process.stdout.write(JSON.stringify(renders));
