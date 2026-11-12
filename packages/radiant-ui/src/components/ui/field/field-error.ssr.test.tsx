import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiFieldError } from './field-error';

describe('RuiFieldError SSR', () => {
	it('renders a controlled error visible on the server', () => {
		const html = renderToString(<RuiFieldError error="Add at least one item" />);

		expect(html).toContain('Add at least one item');
		expect(html).toContain('data-rui-field-error-controlled');
		expect(html).not.toContain('hidden');
	});

	it('renders an uncontrolled error hidden', () => {
		const html = renderToString(<RuiFieldError />);

		expect(html).toContain('hidden');
		expect(html).not.toContain('data-rui-field-error-controlled');
	});

	it('falls back to children when the error is empty', () => {
		const html = renderToString(<RuiFieldError error="">Fallback text</RuiFieldError>);

		expect(html).toContain('Fallback text');
		expect(html).toContain('data-rui-field-error-controlled');
	});
});
