import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiButton } from './button';

describe('RuiButton SSR', () => {
	it('combines a square shape with the selected control size', () => {
		const html = renderToString(
			<RuiButton size="sm" square aria-label="Add item">
				+
			</RuiButton>,
		);

		expect(html).toContain('rui-button--sm');
		expect(html).toContain('rui-button--square');
		expect(html).toContain('aria-label="Add item"');
	});
});
