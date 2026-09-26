import { beforeAll, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import './sidebar.css';

/**
 * Mirrors SSR output: triggers carry `placement` and a per-placement
 * `data-sidebar-state` guess, but no `data-sidebar-mobile` until they attach.
 */
function renderSsrShell({
	collapsible,
	state,
	docs,
}: {
	collapsible: 'off' | 'icon';
	state: 'expanded' | 'collapsed';
	docs: boolean;
}): { header: HTMLElement; inset: HTMLElement } {
	const row = `
		<rui-sidebar collapsible="${collapsible}" id="s" data-state="${state}" aria-label="Docs">
			<div class="rui-sidebar" data-ref="root">
				<div class="rui-sidebar__pane" data-ref="pane">
					<div class="rui-sidebar__header">
						<rui-sidebar-trigger controls="s" placement="header" data-sidebar-state="expanded">
							<button data-ref="button" type="button">header</button>
						</rui-sidebar-trigger>
					</div>
				</div>
			</div>
		</rui-sidebar>
		<main class="rui-sidebar__inset">
			<rui-sidebar-trigger controls="s" placement="inset" data-sidebar-state="collapsed">
				<button data-ref="button" type="button">inset</button>
			</rui-sidebar-trigger>
		</main>`;
	document.body.innerHTML = docs
		? `<div class="rui-sidebar-provider" data-layout="docs"><div class="rui-sidebar-provider__body">${row}</div></div>`
		: `<div class="rui-sidebar-provider" data-layout="default">${row}</div>`;
	return {
		header: document.querySelector('rui-sidebar-trigger[placement="header"]') as HTMLElement,
		inset: document.querySelector('rui-sidebar-trigger[placement="inset"]') as HTMLElement,
	};
}

const hidden = (element: HTMLElement): boolean => getComputedStyle(element).display === 'none';

describe('sidebar trigger visibility before hydration (desktop)', () => {
	beforeAll(async () => {
		await page.viewport(1280, 800);
	});

	it('keeps the hosts un-upgraded', () => {
		expect(customElements.get('rui-sidebar-trigger')).toBeUndefined();
		expect(customElements.get('rui-sidebar')).toBeUndefined();
		expect(window.matchMedia('(min-width: 768px)').matches).toBe(true);
	});

	it.each([
		{ collapsible: 'off', state: 'expanded', docs: false, header: true, inset: true },
		{ collapsible: 'off', state: 'expanded', docs: true, header: true, inset: true },
		{ collapsible: 'icon', state: 'expanded', docs: false, header: false, inset: true },
		{ collapsible: 'icon', state: 'collapsed', docs: true, header: true, inset: false },
	] as const)(
		'collapsible=$collapsible state=$state docs=$docs hides header=$header inset=$inset',
		({ collapsible, state, docs, header, inset }) => {
			const triggers = renderSsrShell({ collapsible, state, docs });
			expect(hidden(triggers.header)).toBe(header);
			expect(hidden(triggers.inset)).toBe(inset);
		},
	);
});
