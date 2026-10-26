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
			expect(parsed.querySelector(render.tag)?.textContent).toBe(render.text);
		},
	);
});

describe('a host in HTML context in server HTML', () => {
	test('keeps raw CSS byte-identical', () => {
		const render = renders.find((entry) => !entry.foreign);

		expect(render?.html).toBe(`<light-host><style>${render?.text}</style></light-host>`);
		expect(parse(render?.html ?? '').querySelector('style')?.textContent).toBe(render?.text);
	});
});
