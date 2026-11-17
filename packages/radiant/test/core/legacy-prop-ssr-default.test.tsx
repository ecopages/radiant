// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { beforeAll, describe, expect, test } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { controller } from '../../src/decorators/controller';
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

declare const __LEGACY_ENVIRONMENT__: boolean;

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

@controller('ssr-prop-precedence-initializer')
class InitializerController extends RadiantController {
	@prop({ type: String }) label = 'initializer';
}

@controller('ssr-prop-precedence-default')
class DefaultWinsController extends RadiantController {
	@prop({ type: String, defaultValue: 'default' }) label = 'initializer';
}

class PlainController extends RadiantController {
	@prop({ type: String, defaultValue: 'default' }) label = 'initializer';
}

async function resolveOnServer<T extends RadiantController & { label: string }>(
	Controller: new (host: Element) => T,
	assign?: string,
): Promise<string> {
	let seen = '';
	await renderController(Controller, {
		tagName: 'section',
		initialize: (instance) => {
			if (assign !== undefined) {
				instance.label = assign;
			}
			seen = instance.label;
		},
	});

	return seen;
}

describe('where a Controller Host prop value comes from, on the server', () => {
	beforeAll(() => {
		installLightDomShim();
	});

	test('an initializer with no defaultValue is the value', async () => {
		expect(await resolveOnServer(InitializerController)).toBe('initializer');
	});

	test('a defaultValue wins over a differing initializer', async () => {
		expect(await resolveOnServer(DefaultWinsController)).toBe('default');
	});

	test('a value assigned in initialize wins over both', async () => {
		expect(await resolveOnServer(DefaultWinsController, 'assigned')).toBe('assigned');
		expect(await resolveOnServer(InitializerController, 'assigned')).toBe('assigned');
	});

	test.skipIf(!__LEGACY_ENVIRONMENT__)(
		'a legacy class without @controller takes its own value over the defaultValue',
		async () => {
			expect(await resolveOnServer(PlainController)).toBe('initializer');
		},
	);

	test.skipIf(__LEGACY_ENVIRONMENT__)('a standard class without @controller keeps the defaultValue', async () => {
		expect(await resolveOnServer(PlainController)).toBe('default');
	});
});
