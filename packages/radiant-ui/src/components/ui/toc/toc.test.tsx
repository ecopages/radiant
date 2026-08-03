import { describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable, type JsxRoot } from '@ecopages/jsx';
import { RuiToc } from './toc';

function mount(element: JsxRenderable): { host: HTMLElement; cleanup: () => void } {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root: JsxRoot = createRoot(host);
	root.render(element);
	return {
		host,
		cleanup: () => {
			root.unmount();
			host.remove();
		},
	};
}

function tick(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

async function settled(): Promise<void> {
	await Promise.resolve();
	await tick();
}

describe('RuiToc navigation events', () => {
	it('rebuilds after eco:page-load when navigationEvents is configured', async () => {
		const { host, cleanup } = mount(
			<div>
				<article id="article">
					<h2 id="intro">Intro</h2>
					<h2 id="setup">Setup</h2>
				</article>
				<RuiToc target="#article" navigationEvents="eco:page-load" />
			</div>,
		);

		await settled();

		const toc = host.querySelector('rui-toc')!;
		expect(toc.querySelectorAll('a[href="#intro"]')).toHaveLength(1);
		expect(toc.querySelectorAll('a[href="#setup"]')).toHaveLength(1);

		const article = host.querySelector('#article')!;
		article.innerHTML = '<h2 id="intro">Intro</h2><h2 id="new-section">New section</h2>';

		document.dispatchEvent(new Event('eco:page-load'));
		await settled();

		expect(toc.querySelectorAll('a[href="#new-section"]')).toHaveLength(1);
		expect(toc.querySelectorAll('a[href="#setup"]')).toHaveLength(0);

		cleanup();
	});
});
