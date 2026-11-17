// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { beforeAll, describe, expect, test } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';
import { renderRadiantElementHostToString } from '../../src/server/radiant-element-ssr';
import { installLightDomShim } from '../../src/server/light-dom-shim';
import { renderController } from '../../src/server/render-controller';

class DeclaredController extends RadiantController {
	@prop({ type: String, defaultValue: 'fallback' }) label!: string;
	@prop({ type: String, defaultValue: 'fallback' }) written!: string;
}

@customElement('declared-prop-ssr-element')
class DeclaredElement extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: 'fallback' }) label!: string;
}

describe('a declared @prop that nothing assigned, on the server', () => {
	beforeAll(() => {
		installLightDomShim();
	});

	test('resolves a Controller Host prop to its defaultValue', async () => {
		const seen: string[] = [];
		await renderController(DeclaredController, {
			tagName: 'section',
			initialize: (controller) => {
				seen.push(controller.label);
			},
		});

		expect(seen).toEqual(['fallback']);
	});

	test('still takes a value assigned before the server initialize hook', async () => {
		const seen: string[] = [];
		await renderController(DeclaredController, {
			tagName: 'section',
			initialize: (controller) => {
				controller.written = 'assigned';
				seen.push(controller.written);
			},
		});

		expect(seen).toEqual(['assigned']);
	});

	test('resolves an Element Host prop to its defaultValue', () => {
		expect(renderRadiantElementHostToString(new DeclaredElement())).toContain('label="fallback"');
	});
});
