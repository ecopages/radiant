import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { createRoot } from '@ecopages/jsx';
import '../../../styles/radiant-ui.css';
import './sidebar.css';
import { RuiSidebarInset, RuiSidebarProvider } from './sidebar';

type Mounted = { provider: HTMLElement; headerRow: HTMLElement; body: HTMLElement; cleanup: () => void };

function mount(): Mounted {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	root.render(
		<RuiSidebarProvider layout="docs" siteHeader={<div class="rui-sidebar-provider__site-header-inner">Site</div>}>
			<RuiSidebarInset>
				<p>Content</p>
			</RuiSidebarInset>
		</RuiSidebarProvider>,
	);
	const query = (selector: string) => host.querySelector<HTMLElement>(selector)!;
	return {
		provider: query('.rui-sidebar-provider'),
		headerRow: query('.rui-sidebar-provider__site-header-inner'),
		body: query('.rui-sidebar-provider__body'),
		cleanup: () => {
			root.unmount();
			host.remove();
		},
	};
}

afterEach(() => {
	document.body.replaceChildren();
});

describe('RuiSidebarProvider docs layout container width', () => {
	it('keeps the 7xl cap on the header row and body by default', async () => {
		await page.viewport(1600, 900);
		const { headerRow, body, cleanup } = mount();

		expect(getComputedStyle(headerRow).maxWidth).toBe('1280px');
		expect(getComputedStyle(body).maxWidth).toBe('1280px');
		cleanup();
	});

	it('caps the header row and body at --rui-sidebar-container when it is set', async () => {
		await page.viewport(1600, 900);
		const { provider, headerRow, body, cleanup } = mount();

		provider.style.setProperty('--rui-sidebar-container', '90rem');

		expect(getComputedStyle(headerRow).maxWidth).toBe('1440px');
		expect(getComputedStyle(body).maxWidth).toBe('1440px');
		cleanup();
	});
});
