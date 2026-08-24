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
		expect(html).toContain('2 / 4');
	});
});
