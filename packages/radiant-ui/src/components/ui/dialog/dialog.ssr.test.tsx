import '@ecopages/radiant/server/install-ssr-runtime';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiDialog, RuiDialogBody, RuiDialogClose } from './dialog';

describe('RuiDialogClose SSR', () => {
	it('forwards native submit name and value', () => {
		const html = renderToString(<RuiDialogClose name="intent" value="close" />);

		expect(html).toContain('name="intent"');
		expect(html).toContain('value="close"');
	});
});

describe('RuiDialog SSR', () => {
	it('renders open through the custom element bridge without touching the document', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiDialog open label="Delete">
					<RuiDialogBody>Sure?</RuiDialogBody>
				</RuiDialog>,
			),
		);

		expect(html).toContain('Sure?');
	});
});
