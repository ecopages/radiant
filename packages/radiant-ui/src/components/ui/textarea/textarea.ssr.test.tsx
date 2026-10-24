import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiTextarea } from './textarea';

describe('RuiTextarea SSR', () => {
	it('forwards native textarea attributes', () => {
		const html = renderToString(<RuiTextarea required maxlength={80} autocomplete="off" />);

		expect(html).toContain('required');
		expect(html).toContain('maxlength="80"');
		expect(html).toContain('autocomplete="off"');
	});
});
