import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { createRoot } from '@ecopages/jsx';
import { RuiPagination } from './pagination';
import './pagination.css';

function mount(className?: string): HTMLElement {
	const container = document.createElement('div');
	document.body.append(container);
	createRoot(container).render(<RuiPagination class={className} page={4} pageCount={12} />);
	return container;
}

function chrome(container: HTMLElement) {
	const style = (selector: string) => getComputedStyle(container.querySelector(selector)!);
	return {
		previousText: style('.rui-pagination__link--previous span').position,
		page: style('.rui-pagination__page').display,
		ellipsis: style('.rui-pagination__ellipsis').display,
		status: style('.rui-pagination__status').display,
	};
}

const fullChrome = { previousText: 'static', page: 'flex', ellipsis: 'flex', status: 'none' };
const narrowChrome = { previousText: 'absolute', page: 'none', ellipsis: 'none', status: 'flex' };

describe('RuiPagination narrow chrome', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('shows the full page list on wide viewports', async () => {
		await page.viewport(1024, 768);
		expect(chrome(mount())).toEqual(fullChrome);
	});

	it('applies the narrow chrome below 40rem', async () => {
		await page.viewport(400, 768);
		expect(chrome(mount())).toEqual(narrowChrome);
	});

	it('applies the same narrow chrome with rui-pagination--compact on wide viewports', async () => {
		await page.viewport(1024, 768);
		expect(chrome(mount('rui-pagination--compact'))).toEqual(narrowChrome);
	});
});

describe('RuiPagination links', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('leaves a click on a page link to the browser and emits no page change', async () => {
		const container = document.createElement('div');
		document.body.append(container);
		createRoot(container).render(
			<RuiPagination page={2} pageCount={5} getHref={(target) => `/list/page/${target}`} />,
		);
		await customElements.whenDefined('rui-pagination');
		await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

		const host = container.querySelector('rui-pagination') as HTMLElement;
		const changes: unknown[] = [];
		host.addEventListener('rui-page-change', (event) => changes.push(event));
		let prevented: boolean | undefined;
		container.addEventListener('click', (event) => {
			prevented = event.defaultPrevented;
			event.preventDefault();
		});

		(container.querySelector('a[data-pagination-page="4"]') as HTMLAnchorElement).click();

		expect(prevented).toBe(false);
		expect(changes).toEqual([]);
	});

	it('still emits a page change for an anchor without an href', async () => {
		const container = document.createElement('div');
		document.body.append(container);
		container.innerHTML =
			'<rui-pagination page="2" page-count="5"><nav><a data-pagination-page="3">3</a></nav></rui-pagination>';
		await customElements.whenDefined('rui-pagination');
		await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

		const host = container.querySelector('rui-pagination') as HTMLElement;
		const changes: number[] = [];
		host.addEventListener('rui-page-change', (event) =>
			changes.push((event as CustomEvent<{ page: number }>).detail.page),
		);

		(container.querySelector('a') as HTMLAnchorElement).click();

		expect(changes).toEqual([3]);
	});
});
