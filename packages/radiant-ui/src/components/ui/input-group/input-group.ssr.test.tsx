import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiInput } from '../input';
import { RuiInputGroup, RuiInputGroupAddon, RuiInputGroupText } from './input-group';

describe('RuiInputGroup SSR', () => {
	it('renders group role and nested input control marker', () => {
		const html = renderToString(
			<RuiInputGroup>
				<RuiInputGroupAddon>
					<RuiInputGroupText>https://</RuiInputGroupText>
				</RuiInputGroupAddon>
				<RuiInput id="url" placeholder="example.com" />
			</RuiInputGroup>,
		);

		expect(html).toContain('rui-input-group');
		expect(html).toContain('role="group"');
		expect(html).toContain('rui-input-group__addon--start');
		expect(html).toContain('data-rui-control');
	});
});
