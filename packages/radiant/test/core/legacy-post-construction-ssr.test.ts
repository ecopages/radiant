// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { describe, expect, test } from 'vitest';
import { renderController } from '../../src/server/render-controller';
import { LegacyPostConstructionController } from '../fixtures/legacy-post-construction-controller';

describe('legacy post-construction decorator setup on the server', () => {
	test('makes post-construction decorated fields available during controller SSR initialize()', async () => {
		const rendered = await renderController(LegacyPostConstructionController, {
			tagName: 'section',
			initialize: (controller) => {
				controller.provider.setContext({ count: 9 });
				controller.status.set('server-ready');
			},
		});

		expect(rendered.markup).toContain('data-context-count="9"');
		expect(rendered.markup).toContain('data-status="server-ready"');
	});
});
