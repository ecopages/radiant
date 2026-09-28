import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiSpinner } from './spinner';

describe('RuiSpinner SSR', () => {
	it('renders status role and default accessible label', () => {
		const html = renderToString(<RuiSpinner />);

		expect(html).toContain('rui-spinner');
		expect(html).toContain('rui-spinner--md');
		expect(html).toContain('role="status"');
		expect(html).toContain('aria-label="Loading"');
	});

	it('applies size modifier', () => {
		const html = renderToString(<RuiSpinner size="lg" />);
		expect(html).toContain('rui-spinner--lg');
	});
});
