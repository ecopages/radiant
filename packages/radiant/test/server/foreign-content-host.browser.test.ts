import { describe, expect, test } from 'vitest';
import { commands } from 'vitest/browser';
import type {} from './foreign-content-host-ssr';

/**
 * Hosts the page places inside `svg` or `math`, rendered by the Node SSR runtime and parsed by Chromium: their light
 * DOM and view are foreign content there, so text in a raw-text tag under them must stay text.
 */

const renders = await commands.renderForeignContentHosts();

function parse(html: string): Document {
	return new DOMParser().parseFromString(`<body>${html}`, 'text/html');
}

describe('a host inside foreign content in server HTML', () => {
	test.each(renders.filter((render) => render.foreign).map((render) => [render.name, render] as const))(
		'%s cannot create elements',
		(_name, render) => {
			const parsed = parse(render.html);

			expect(parsed.querySelector('img'), render.html).toBeNull();
			expect(parsed.querySelector('b'), render.html).toBeNull();
			expect(parsed.querySelector(render.tag)?.textContent).toBe(render.text);
		},
	);
});

describe('the slot-projection payload in server HTML', () => {
	test.each(
		renders
			.filter((render) => render.html.includes('data-radiant-slot-projection'))
			.map((render) => [render.name, render] as const),
	)('%s restores the authored text as the client parses it', (_name, render) => {
		const script = parse(render.html).querySelector('script[data-radiant-slot-projection]');
		const payload = JSON.parse(script?.textContent ?? '') as Record<string, string[]>;
		const template = document.createElement('template');
		template.innerHTML = Object.values(payload).flat().join('');

		expect(template.content.querySelector('img')).toBeNull();
		expect(template.content.querySelector(render.tag)?.textContent).toBe(render.text);
	});
});

describe('a host in HTML context in server HTML', () => {
	test.each(renders.filter((render) => !render.foreign).map((render) => [render.name, render] as const))(
		'%s keeps raw CSS byte-identical',
		(_name, render) => {
			const parsed = parse(render.html);

			expect(render.html).toContain(`<style>${render.text}</style>`);
			expect(parsed.querySelector('img')).toBeNull();
			expect(parsed.querySelector(render.tag)?.textContent).toBe(render.text);
		},
	);

	test('a host in HTML is emitted exactly', () => {
		const render = renders.find((entry) => entry.name === 'host light DOM style in HTML, plain');

		expect(render?.html).toBe(`<light-host><style>${render?.text}</style></light-host>`);
	});

	test('a style slotted into an HTML view is emitted exactly', () => {
		const render = renders.find((entry) => entry.name === 'div-slot-host slotted style, plain');

		expect(render?.html).toBe(
			`<div-slot-host><div><style>${render?.text}</style></div><script type="application/json" data-radiant-slot-projection>{"":["\\u003cstyle>@media (width \\u003c 600px) { p { color: red } }\\u003c/style>"]}</script></div-slot-host>`,
		);
	});
});
