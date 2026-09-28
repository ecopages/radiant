import '@ecopages/radiant/server/install-ssr-runtime';
import '@ecopages/radiant/client/install-hydrator';
import { createRoot } from '@ecopages/jsx';
import { afterEach, describe, expect, it } from 'vitest';
import { RuiSidebar, RuiSidebarContent } from './sidebar';

function replaceBody(newDocument: Document, persistAttribute = 'data-eco-persist'): void {
	const persistedElements = document.body.querySelectorAll(`[${persistAttribute}]`);
	const persistedMap = new Map<string, Element>();

	for (const el of persistedElements) {
		const key = el.getAttribute(persistAttribute);
		if (key) {
			persistedMap.set(key, el);
		}
	}

	for (const [key, oldEl] of persistedMap) {
		const placeholder = newDocument.body.querySelector(`[${persistAttribute}="${key}"]`);
		if (placeholder) {
			placeholder.replaceWith(oldEl);
		}
	}

	document.body.replaceChildren(...Array.from(newDocument.body.childNodes));
}

function tick(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

async function settled(): Promise<void> {
	await Promise.resolve();
	await tick();
}

describe('RuiSidebar eco persist', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('keeps scroll position across replaceBody when the host is persisted', async () => {
		const host = document.createElement('div');
		document.body.appendChild(host);

		const root = createRoot(host);
		root.render(
			<RuiSidebar id="docs-sidebar" data-eco-persist="docs-sidebar" label="Docs">
				<RuiSidebarContent aria-label="Docs">
					<div style={{ height: '1200px' }}>Tall navigation</div>
				</RuiSidebarContent>
			</RuiSidebar>,
		);

		await customElements.whenDefined('rui-sidebar');
		await settled();
		await tick();

		const sidebar = host.querySelector('rui-sidebar') as HTMLElement & { update: () => void };
		const content = host.querySelector('.rui-sidebar__content') as HTMLElement;
		content.scrollTop = 240;

		sidebar.update();
		await settled();
		expect(content.scrollTop).toBe(240);

		const nextPage = new DOMParser().parseFromString(
			`<!DOCTYPE html><html><body>
				<div class="page">
					<rui-sidebar id="docs-sidebar" data-eco-persist="docs-sidebar" label="Docs">
						<div class="rui-sidebar__content" aria-label="Docs">
							<div style="height: 1200px">Fresh navigation</div>
						</div>
					</rui-sidebar>
					<main>New page content</main>
				</div>
			</body></html>`,
			'text/html',
		);

		document.body.innerHTML = `<div class="page">${host.innerHTML}<main>Old page content</main></div>`;
		await customElements.whenDefined('rui-sidebar');
		await settled();

		const liveSidebar = document.querySelector('rui-sidebar') as HTMLElement;
		const liveContent = document.querySelector('.rui-sidebar__content') as HTMLElement;
		liveContent.scrollTop = 240;

		replaceBody(nextPage);

		await settled();
		await tick();

		const persistedContent = document.querySelector('.rui-sidebar__content') as HTMLElement;
		expect(persistedContent.scrollTop).toBe(240);
		expect(persistedContent).toBe(liveContent);
		expect(document.querySelector('rui-sidebar')).toBe(liveSidebar);
		expect(document.body.textContent).toContain('New page content');
	});
});
