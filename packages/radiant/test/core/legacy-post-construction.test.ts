import type { WritableSignal } from '@ecopages/signals';
import { describe, expect, test } from 'vitest';
import { ContextProvider, createContext, provideContext } from '../../src/context';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import {
	registerLegacyPostConstructionInitializer,
	runLegacyPostConstructionInitializers,
} from '../../src/decorators/legacy/instance-initializers';
import { signal } from '../../src/decorators/signal';
import { renderController } from '../../src/server/render-controller';

const postConstructionContext = createContext<{ count: number }>(Symbol('post-construction-context'));

@customElement('legacy-post-construction-element-test')
class LegacyPostConstructionElement extends RadiantElement {
	@provideContext<typeof postConstructionContext>({
		context: postConstructionContext,
		initialValue: { count: 1 },
		hydrate: Object,
	})
	provider!: ContextProvider<typeof postConstructionContext>;
}

class LegacyPostConstructionController extends RadiantController {
	@provideContext<typeof postConstructionContext>({
		context: postConstructionContext,
		initialValue: { count: 1 },
	})
	provider!: ContextProvider<typeof postConstructionContext>;

	@signal({ initial: 'ready' })
	status!: WritableSignal<string>;

	override connect(): void {
		super.connect();
		this.host.setAttribute('data-context-count', String(this.provider.getContext().count));
		this.host.setAttribute('data-status', this.status.get());
	}
}

describe('legacy post-construction decorator setup', () => {
	test('bootstraps decorated providers when SSR host getters run before connection', () => {
		const element = document.createElement(
			'legacy-post-construction-element-test',
		) as LegacyPostConstructionElement;

		const providers = element.getContextProviders();
		const bindings = element.getHydrationBindings();

		expect(providers).toHaveLength(1);
		expect(providers[0]).toBe(element.provider);
		expect(element.provider.getContext()).toEqual({ count: 1 });
		expect(bindings).toHaveLength(1);
		expect(bindings[0].renderHydrationScriptTag()).toContain('{"count":1}');
	});

	test('runs post-construction decorator setup at most once per instance', () => {
		const element = document.createElement(
			'legacy-post-construction-element-test',
		) as LegacyPostConstructionElement;

		const firstProviders = element.getContextProviders();
		const firstBindings = element.getHydrationBindings();
		const firstProvider = element.provider;

		document.body.appendChild(element);

		const secondProviders = element.getContextProviders();
		const secondBindings = element.getHydrationBindings();

		expect(firstProviders).toHaveLength(1);
		expect(secondProviders).toHaveLength(1);
		expect(firstBindings).toHaveLength(1);
		expect(secondBindings).toHaveLength(1);
		expect(secondProviders[0]).toBe(firstProvider);
		expect(secondBindings[0]).toBe(firstBindings[0]);
	});

	test('keeps base and derived post-construction initializer registries separate', () => {
		const calls: string[] = [];

		class BaseHost {}
		class DerivedHost extends BaseHost {}

		registerLegacyPostConstructionInitializer(BaseHost.prototype, () => {
			calls.push('base');
		});
		registerLegacyPostConstructionInitializer(DerivedHost.prototype, () => {
			calls.push('derived');
		});

		runLegacyPostConstructionInitializers(new BaseHost());
		expect(calls).toEqual(['base']);

		calls.length = 0;
		runLegacyPostConstructionInitializers(new DerivedHost());
		expect(calls).toEqual(['base', 'derived']);
	});

	test('makes post-construction decorated fields available during controller connect()', () => {
		const host = document.createElement('div');
		const controller = new LegacyPostConstructionController(host);

		controller.connect();

		expect(host.getAttribute('data-context-count')).toBe('1');
		expect(host.getAttribute('data-status')).toBe('ready');
	});

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
