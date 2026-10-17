import '@ecopages/radiant/server/install-ssr-runtime';
import { renderRadiantElementHostToString } from '@ecopages/radiant/server/radiant-element-ssr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RuiToc } from './toc.script';

describe('RuiToc SSR navigation listeners', () => {
	let documentAddSpy: ReturnType<typeof vi.spyOn>;
	/** The SSR window has no `addEventListener`, so a call would throw; spy only where it exists. */
	let windowAddSpy: ReturnType<typeof vi.spyOn> | undefined;

	beforeEach(() => {
		documentAddSpy = vi.spyOn(document, 'addEventListener');
		windowAddSpy = typeof window.addEventListener === 'function' ? vi.spyOn(window, 'addEventListener') : undefined;
	});

	afterEach(() => {
		documentAddSpy.mockRestore();
		windowAddSpy?.mockRestore();
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
			windowAddSpy?.mock.calls.filter((call: Parameters<Window['addEventListener']>) => call[0] === 'scroll') ??
				[],
		).toHaveLength(0);
	});
});
