import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiHoverCard, RuiHoverCardContent, RuiHoverCardTrigger } from './hover-card';

describe('RuiHoverCard SSR', () => {
	it('renders the view-owned trigger and preview shell', () => {
		const html = renderToString(
			<RuiHoverCard contentLabel="Preview" placement="bottom-start">
				<RuiHoverCardTrigger>
					<button type="button">Jane Cooper</button>
				</RuiHoverCardTrigger>
				<RuiHoverCardContent>
					<p>Preview body</p>
				</RuiHoverCardContent>
			</RuiHoverCard>,
		);

		expect(html).toContain('<rui-hover-card');
		expect(html).toContain('data-hover-card-trigger');
		expect(html).toContain('data-ref="content"');
		expect(html).toContain('Preview body');
		expect(html).not.toContain('slot=');
	});
});
