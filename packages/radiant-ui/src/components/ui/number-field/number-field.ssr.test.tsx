import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiNumberFieldInput } from './number-field';

describe('RuiNumberFieldInput SSR', () => {
	it('forwards native input attributes', () => {
		const html = renderToString(<RuiNumberFieldInput required name="qty" />);

		expect(html).toContain('required');
		expect(html).toContain('name="qty"');
	});
});
