import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiBadge } from './badge';

describe('RuiBadge SSR', () => {
	it('renders variant modifier', () => {
		const html = renderToString(<RuiBadge variant="destructive">Error</RuiBadge>);

		expect(html).toContain('rui-badge');
		expect(html).toContain('rui-badge--destructive');
		expect(html).toContain('Error');
	});
});
