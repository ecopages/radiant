import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiInput } from './input';

describe('RuiInput SSR', () => {
	it('forwards host and native fields to the input', () => {
		const html = renderToString(
			<RuiInput
				id="email"
				name="email"
				title="Email"
				placeholder="you@example.com"
				aria-label="Email"
				data-state="ready"
			/>,
		);

		expect(html).toContain('id="email"');
		expect(html).toContain('name="email"');
		expect(html).toContain('title="Email"');
		expect(html).toContain('placeholder="you@example.com"');
		expect(html).toContain('aria-label="Email"');
		expect(html).toContain('data-state="ready"');
		expect(html).not.toContain('mask=');
	});

	it('does not serialize the view-only mask prop', () => {
		const html = renderToString(<RuiInput mask="{000}" value="1" />);

		expect(html).not.toContain('mask');
	});
});
