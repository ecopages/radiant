import { describe, expect, test } from 'vitest';
import { ContextProvider, provideContext } from '../../src/context';
import {
	LegacyPostConstructionController,
	postConstructionContext,
} from '../fixtures/legacy-post-construction-controller';
import { setCustomElementTagName } from '../../src/core/custom-element-metadata';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import {
	registerLegacyPostConstructionInitializer,
	runLegacyPostConstructionInitializers,
} from '../../src/decorators/legacy/instance-initializers';
import { ensureLegacyHostReady } from '../../src/decorators/legacy/host-readiness';
import { reactiveProp as legacyReactiveProp } from '../../src/decorators/legacy/reactive-prop';
import { prop } from '../../src/decorators/prop';
import { state } from '../../src/decorators/state';
import { installLightDomShim } from '../../src/server/light-dom-shim';
import { REACTIVE_HOST } from '../../src/core/reactive-host';

@customElement('legacy-post-construction-element-test')
class LegacyPostConstructionElement extends RadiantElement {
	@provideContext<typeof postConstructionContext>({
		context: postConstructionContext,
		initialValue: { count: 1 },
		hydrate: Object,
	})
	provider!: ContextProvider<typeof postConstructionContext>;
}

describe('legacy post-construction decorator setup', () => {
	test('bootstraps decorated providers when SSR host getters run before connection', () => {
		const element = document.createElement(
			'legacy-post-construction-element-test',
		) as LegacyPostConstructionElement;

		ensureLegacyHostReady(element, 'ssr');

		const providers = element[REACTIVE_HOST].ssrRegistry.getContextProviders();
		const bindings = element[REACTIVE_HOST].ssrRegistry.getHydrationBindings();

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

		ensureLegacyHostReady(element, 'ssr');

		const firstProviders = element[REACTIVE_HOST].ssrRegistry.getContextProviders();
		const firstBindings = element[REACTIVE_HOST].ssrRegistry.getHydrationBindings();
		const firstProvider = element.provider;

		document.body.appendChild(element);

		const secondProviders = element[REACTIVE_HOST].ssrRegistry.getContextProviders();
		const secondBindings = element[REACTIVE_HOST].ssrRegistry.getHydrationBindings();

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
		class GrandchildHost extends DerivedHost {}

		registerLegacyPostConstructionInitializer(BaseHost.prototype, () => {
			calls.push('base');
		});
		registerLegacyPostConstructionInitializer(DerivedHost.prototype, () => {
			calls.push('derived');
		});

		runLegacyPostConstructionInitializers(new BaseHost(), 'ssr');
		expect(calls).toEqual(['base']);

		calls.length = 0;
		runLegacyPostConstructionInitializers(new DerivedHost(), 'ssr');
		expect(calls).toEqual(['base', 'derived']);

		calls.length = 0;
		runLegacyPostConstructionInitializers(new GrandchildHost(), 'ssr');
		expect(calls).toEqual(['base', 'derived']);
	});

	test('makes post-construction decorated fields available during controller connect()', () => {
		const host = document.createElement('div');
		const controller = new LegacyPostConstructionController(host);

		controller.connect();

		expect(host.getAttribute('data-context-count')).toBe('1');
		expect(host.getAttribute('data-status')).toBe('ready');
	});

	test('registers legacy reactive members before SSR binding reads', () => {
		installLightDomShim();

		type LegacySsrBindingCardBindings = {
			count: number;
			label: string;
		};

		class LegacySsrBindingCard extends RadiantElement<LegacySsrBindingCardBindings> {
			count!: number;

			override render() {
				return this.bind('count');
			}
		}

		legacyReactiveProp({
			type: Number,
			reflect: true,
			defaultValue: 3,
			bind: true,
		})(LegacySsrBindingCard.prototype, 'count');

		setCustomElementTagName(LegacySsrBindingCard, 'legacy-ssr-binding-card-test');
		customElements.define('legacy-ssr-binding-card-test', LegacySsrBindingCard);

		const element = document.createElement('legacy-ssr-binding-card-test') as LegacySsrBindingCard;
		element.count = 28;

		ensureLegacyHostReady(element, 'ssr');

		expect(element.getReactiveMember('count')?.get()).toBe(28);
		expect(element.bind('count').getValue()).toBe(28);
	});

	test('registers legacy @state and @prop members before subclass field initializers read bindings', () => {
		type LegacyFieldInitializerBindings = {
			preference: string;
			config: { label: string };
		};

		@customElement('legacy-field-initializer-lab-test')
		class LegacyFieldInitializerLab extends RadiantElement<LegacyFieldInitializerBindings> {
			@state preference = 'light';
			@prop({ type: Object, defaultValue: { label: 'Hello' }, bind: true })
			config: { label: string } = { label: 'Hello' };

			private readonly preferenceLabel = this.$.preference.map((preference) => `pref:${preference}`);
			private readonly configLabel = this.$.config.map((config) => config.label);

			override render() {
				return `${this.preferenceLabel.getValue()}|${this.configLabel.getValue()}`;
			}
		}

		const element = document.createElement('legacy-field-initializer-lab-test') as LegacyFieldInitializerLab;
		document.body.appendChild(element);

		expect(element.bind('preference').getValue()).toBe('light');
		expect(element.bind('config').getValue()).toEqual({ label: 'Hello' });
		expect(
			element
				.bind('preference')
				.map((preference) => `pref:${preference}`)
				.getValue(),
		).toBe('pref:light');
		expect(
			element
				.bind('config')
				.map((config) => config.label)
				.getValue(),
		).toBe('Hello');
	});
});
