import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiDialogClose } from './dialog';

describe('RuiDialogClose SSR', () => {
	it('forwards native submit name and value', () => {
		const html = renderToString(<RuiDialogClose name="intent" value="close" />);

		expect(html).toContain('name="intent"');
		expect(html).toContain('value="close"');
	});
});
