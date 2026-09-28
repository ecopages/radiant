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
});
