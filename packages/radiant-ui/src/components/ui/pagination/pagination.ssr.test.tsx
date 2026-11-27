import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiPagination } from './pagination';

describe('RuiPagination SSR', () => {
	it('renders the navigation landmark and current page', () => {
		const html = renderToString(<RuiPagination label="Search result pages" page={2} pageCount={4} />);

		expect(html).toContain('<rui-pagination');
		expect(html).toContain('aria-label="Search result pages"');
		expect(html).toContain('aria-current="page"');
		expect(html).toContain('Go to page 2');
		expect(html).toContain('rui-pagination__page--current');
		expect(html).toContain('rui-pagination__status');
		expect(html).toContain('Page 2 of 4');
	});

	it('renders localized labels without forwarding them to the host', () => {
		const html = renderToString(
			<RuiPagination
				label="Seiten"
				page={2}
				pageCount={4}
				previousText="Zurück"
				previousLabel="Vorherige Seite"
				nextText="Weiter"
				nextLabel="Nächste Seite"
				pageLabel={(page) => `Seite ${page}`}
				statusLabel={(page, pageCount) => `Seite ${page} von ${pageCount}`}
			/>,
		);

		expect(html).toContain('aria-label="Vorherige Seite"');
		expect(html).toContain('aria-label="Nächste Seite"');
		expect(html).toContain('aria-label="Seite 3"');
		expect(html).toContain('>Zurück</span>');
		expect(html).toContain('>Weiter</span>');
		expect(html).toContain('Seite 2 von 4');
		expect(html).not.toContain('Go to');
		expect(html).not.toMatch(/previous-?label|pageLabel|page-label/i);
	});

	describe('with getHref', () => {
		const getHref = (page: number) => `/list/page/${page}`;
		const links = (html: string) =>
			Array.from(html.matchAll(/<a\b[^>]*data-pagination-page="(\d+)"[^>]*>/g)).map((match) => match[0]);

		it('renders every page control as a link to its page', () => {
			const html = renderToString(<RuiPagination page={2} pageCount={5} getHref={getHref} />);

			const tags = links(html);
			expect(tags.map((tag) => tag.match(/href="([^"]*)"/)?.[1])).toEqual([
				'/list/page/1',
				'/list/page/1',
				'/list/page/2',
				'/list/page/3',
				'/list/page/4',
				'/list/page/5',
				'/list/page/3',
			]);
			expect(html).not.toMatch(/<button[^>]*data-pagination-page/);
		});

		it('marks only the current page link with aria-current', () => {
			const html = renderToString(<RuiPagination page={2} pageCount={5} getHref={getHref} />);

			const current = links(html).filter((tag) => tag.includes('aria-current="page"'));
			expect(current).toHaveLength(1);
			expect(current[0]).toContain('href="/list/page/2"');
		});

		it('renders an unavailable previous or next control as a disabled button, not a link', () => {
			const first = renderToString(<RuiPagination page={1} pageCount={5} getHref={getHref} />);
			expect(first).toMatch(/<button[^>]*data-pagination-page="0"[^>]*disabled/);
			expect(first).not.toContain('href="/list/page/0"');

			const last = renderToString(<RuiPagination page={5} pageCount={5} getHref={getHref} />);
			expect(last).toMatch(/<button[^>]*data-pagination-page="6"[^>]*disabled/);
			expect(last).not.toContain('href="/list/page/6"');
		});

		it('renders every control as a disabled button when the pagination is disabled', () => {
			const html = renderToString(<RuiPagination page={2} pageCount={5} getHref={getHref} disabled />);

			expect(links(html)).toEqual([]);
		});
	});
});
