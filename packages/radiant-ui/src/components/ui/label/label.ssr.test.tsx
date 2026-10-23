import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiInput } from '../input';
import { RuiLabel } from './label';

describe('RuiLabel SSR', () => {
	it('names the control it is for', () => {
		const html = renderToString(
			<>
				<RuiLabel htmlFor="email">Email</RuiLabel>
				<RuiInput id="email" />
			</>,
		);

		expect(html).toContain('for="email"');
		expect(html).toContain('id="email"');
		expect(html).toContain('>Email</label>');
		expect(html).not.toContain('htmlFor');
	});
});
