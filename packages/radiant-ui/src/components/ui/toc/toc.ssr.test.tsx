import '@ecopages/radiant/server/install-ssr-runtime';
import { renderRadiantElementHostToString } from '@ecopages/radiant/server/radiant-element-ssr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RuiToc } from './toc.script';

describe('RuiToc SSR navigation listeners', () => {
	let documentAddSpy: ReturnType<typeof vi.spyOn>;
	let windowAddSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		document.body.innerHTML = '<main id="ssr-toc-content"><h2>Heading</h2></main>';
		documentAddSpy = vi.spyOn(document, 'addEventListener');
		windowAddSpy = vi.spyOn(window, 'addEventListener');
	});

	afterEach(() => {
		documentAddSpy.mockRestore();
		windowAddSpy.mockRestore();
		document.body.innerHTML = '';
	});

	it('does not register navigation or scroll listeners during SSR prop assignment', () => {
		for (let i = 0; i < 24; i++) {
			const toc = new RuiToc();
			toc.target = '#ssr-toc-content';
			toc.navigationEvents = 'eco:page-load,eco:after-swap';
			renderRadiantElementHostToString(toc, { mode: 'hydrate' });
		}

		expect(
			documentAddSpy.mock.calls.filter(
				(call: Parameters<Document['addEventListener']>) => call[0] === 'eco:page-load',
			),
		).toHaveLength(0);
		expect(
			documentAddSpy.mock.calls.filter(
				(call: Parameters<Document['addEventListener']>) => call[0] === 'eco:after-swap',
			),
		).toHaveLength(0);
		expect(
			windowAddSpy.mock.calls.filter((call: Parameters<Window['addEventListener']>) => call[0] === 'scroll'),
		).toHaveLength(0);
	});
});
