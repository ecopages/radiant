import '../../src/server/install-light-dom-shim';
import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, test } from 'vitest';
import {
	type ContextProvider,
	consumeContext,
	createContext,
	onContextUpdate,
	provideContext,
} from '../../src/context';
import { attr } from '../../src/decorators/attr';
import { RadiantController } from '../../src/core/radiant-controller';
import { getRadiantElementSsrRuntime } from '../../src/core/radiant-component-ssr-registry';
import { RadiantElement } from '../../src/core/radiant-element';
import { controller } from '../../src/decorators/controller';
import { customElement } from '../../src/decorators/custom-element';
import { querySlot } from '../../src/decorators/query-slot';
import { registerController } from '../../src/controller-registry';
import { createServerRenderEnvironment } from '../../src/server/light-dom-shim';
import {
	modulePreloadAsset,
	renderComponent,
	renderComponentWithPreview,
	renderComponentToPayload,
	renderComponentToString,
	scriptModuleAsset,
	styleAsset,
	toRenderedComponentPayload,
	type RenderedComponentAsset,
	type ServerRenderableComponent,
} from '../../src/server/render-component';
import { renderController, renderControllerToPayload } from '../../src/server/render-controller';
import { getOrCreateRadiantElementSsrRuntime } from '../../src/server/radiant-component-ssr-runtime';

const cardAssets: readonly RenderedComponentAsset[] = [
	{ kind: 'script-module', src: '/assets/render-component-card.js', stage: 'hydrate' },
];

declare const __LEGACY_ENVIRONMENT__: boolean;

const describeWhenStandard = __LEGACY_ENVIRONMENT__ ? describe.skip : describe;

@customElement('render-component-card-test')
class RenderComponentCard extends RadiantElement {
	count = 1;
	label = 'Initial label';

	override render() {
		return (
			<section>
				<p data-count={String(this.count)}>Count: {this.count}</p>
				<p>{this.label}</p>
			</section>
		);
	}
}

@customElement('render-component-loader-card-test')
class RenderComponentLoaderCard extends RadiantElement {
	message = 'loader default';

	override render() {
		return <p>{this.message}</p>;
	}
}

@customElement('render-component-slot-query-card-test')
class RenderComponentSlotQueryCard extends RadiantElement {
	@querySlot() defaultSlot!: HTMLParagraphElement | null;
	@querySlot({ name: 'header' }) headerSlot!: HTMLHeadingElement | null;

	override render() {
		return (
			<section
				data-default-slot={this.defaultSlot?.textContent ?? 'missing'}
				data-header-slot={this.headerSlot?.textContent ?? 'missing'}
			>
				<header>
					<slot name="header" />
				</header>
				<div>
					<slot />
				</div>
			</section>
		);
	}
}

const renderComponentContext = createContext<{ label: string }>(Symbol('render-component-context'));

@customElement('render-component-context-card-test')
class RenderComponentContextCard extends RadiantElement {
	@consumeContext(renderComponentContext) contextProvider!: ContextProvider<typeof renderComponentContext>;

	@onContextUpdate({ context: renderComponentContext, select: (context) => context.label, subscribe: false })
	updateLabel(label: string) {
		this.setAttribute('data-selected-label', label);
	}

	override render() {
		return (
			<p data-context-provider={this.contextProvider ? 'resolved' : 'missing'}>
				{this.getAttribute('data-selected-label') ?? 'missing'}
			</p>
		);
	}
}

class RenderComponentLogger {
	log(_message: string) {}
}

const renderComponentHydrationContext = createContext<{ count: number; logger: RenderComponentLogger }>(
	Symbol('render-component-hydration-context'),
);

@customElement('render-component-hydrated-provider-test')
class RenderComponentHydratedProvider extends RadiantElement {
	@provideContext<typeof renderComponentHydrationContext>({
		context: renderComponentHydrationContext,
		initialValue: { count: 0, logger: new RenderComponentLogger() },
		hydrate: Object,
		serialize: ({ count }) => ({ count }),
	})
	provider!: ContextProvider<typeof renderComponentHydrationContext>;

	override render() {
		return <p>Count: {this.provider.getContext().count}</p>;
	}
}

@controller('render-controller-card')
class RenderControllerCard extends RadiantController<{ signal: string }> {
	label = 'Initial label';

	@attr({ source: 'data-signal' }) signal = 'idle';

	override render() {
		return (
			<section>
				<p data-signal={this.signal}>Signal: {this.signal}</p>
				<p>{this.label}</p>
			</section>
		);
	}
}

class ProgrammaticRenderControllerCard extends RadiantController {
	override render() {
		return <p>Programmatic controller</p>;
	}
}

registerController('programmatic-render-controller-card', ProgrammaticRenderControllerCard);

describe('render-component server helpers', () => {
	test('component SSR activates runtime only for the active render and does not leak JSX hook state', async () => {
		let runtimeDuringInitialize = getRadiantElementSsrRuntime();

		expect(runtimeDuringInitialize).toBeUndefined();

		await renderComponent(RenderComponentCard, {
			initialize: () => {
				runtimeDuringInitialize = getRadiantElementSsrRuntime();
			},
		});

		expect(runtimeDuringInitialize).toBe(getOrCreateRadiantElementSsrRuntime());
		expect(getRadiantElementSsrRuntime()).toBeUndefined();

		expect(renderToString(<render-component-card-test />)).toBe(
			'<render-component-card-test></render-component-card-test>',
		);
	});

	test('renderComponent() returns the canonical server render descriptor', async () => {
		const rendered = await renderComponent(RenderComponentCard, {
			initialize: (component) => {
				component.count = 9;
				component.label = 'Canonical render';
			},
			clientModuleSrc: '/assets/render-component-card.js',
			now: () => new Date('2026-03-27T13:30:00.000Z'),
		});

		expect(rendered).toEqual({
			markup: expect.stringContaining('<render-component-card-test'),
			metadata: {
				assets: cardAssets,
				clientModuleUrl: '/assets/render-component-card.js',
				generatedAt: '2026-03-27T13:30:00.000Z',
				tagName: 'render-component-card-test',
			},
			preview: expect.any(Object),
		});
		expect(rendered.markup).toContain('Count: 9');
		expect(rendered.markup).toContain('Canonical render');
		expect(toRenderedComponentPayload(rendered)).toEqual({
			assets: cardAssets,
			clientModuleSrc: '/assets/render-component-card.js',
			generatedAt: '2026-03-27T13:30:00.000Z',
			markup: expect.stringContaining('<render-component-card-test'),
			tagName: 'render-component-card-test',
		});
	});

	test('renderController() returns the canonical server render descriptor for an explicit host', async () => {
		const rendered = await renderController(RenderControllerCard, {
			host: {
				class: 'render-controller-card-test',
				data: {
					signal: 'ready',
				},
			},
			clientModuleSrc: '/assets/render-controller-card.js',
			initialize: (controller) => {
				controller.label = 'Controller render';
				controller.host.setAttribute('data-stage', 'server');
			},
			now: () => new Date('2026-03-27T13:31:00.000Z'),
			tagName: 'div',
		});

		expect(rendered.markup).toContain('class="render-controller-card-test"');
		expect(rendered.markup).toContain('data-controller="render-controller-card"');
		expect(rendered.markup).toContain('data-signal="ready"');
		expect(rendered.markup).toContain('data-stage="server"');
		expect(rendered.metadata).toEqual({
			assets: [{ kind: 'script-module', src: '/assets/render-controller-card.js', stage: 'hydrate' }],
			clientModuleUrl: '/assets/render-controller-card.js',
			generatedAt: '2026-03-27T13:31:00.000Z',
			tagName: 'div',
		});
		expect(rendered.markup).toContain('Signal: ready');
		expect(rendered.markup).toContain('Controller render');
	});

	test('renderController() runs subclass connect logic before serializing markup', async () => {
		class LifecycleRenderController extends RadiantController {
			label = 'before connect';

			override connect(): void {
				super.connect();
				this.label = 'after connect';
				this.host.toggleAttribute('aria-busy', true);
			}

			override render() {
				return <p>{this.label}</p>;
			}
		}

		const rendered = await renderController(LifecycleRenderController, {
			tagName: 'div',
		});

		expect(rendered.markup).toContain('aria-busy');
		expect(rendered.markup).toContain('<p>after connect</p>');
	});

	test('renderController() supports connect-time dataset, classList, ownerDocument, and getRootNode access', async () => {
		class HostApiRenderController extends RadiantController {
			override connect(): void {
				super.connect();
				const host = this.host as HTMLElement;

				host.dataset.phase = 'connected';
				host.classList.add('ssr-ready');
				host.setAttribute('data-owner-document', host.ownerDocument ? 'yes' : 'no');
				host.setAttribute('data-root-node-type', String(host.getRootNode().nodeType));
			}

			override render() {
				return <p>Host API SSR</p>;
			}
		}

		const rendered = await renderController(HostApiRenderController, {
			tagName: 'section',
		});

		expect(rendered.markup).toContain('class="ssr-ready"');
		expect(rendered.markup).toContain('data-phase="connected"');
		expect(rendered.markup).toContain('data-owner-document="yes"');
		expect(rendered.markup).toContain('data-root-node-type="1"');
		expect(rendered.markup).toContain('<p>Host API SSR</p>');
	});

	test('renderControllerToPayload() returns the portable fragment payload shape', async () => {
		const payload = await renderControllerToPayload(RenderControllerCard, {
			host: {
				data: {
					signal: 'steady',
				},
			},
			tagName: 'section',
		});

		expect(payload.assets).toEqual([]);
		expect(payload.clientModuleSrc).toBeUndefined();
		expect(payload.generatedAt).toEqual(expect.any(String));
		expect(payload.tagName).toBe('section');
		expect(payload.markup).toContain('<section');
		expect(payload.markup).toContain('data-controller="render-controller-card"');
		expect(payload.markup).toContain('data-signal="steady"');
		expect(payload.markup).toContain('Signal: steady');
	});

	test('renderController() expands jsx-like host data and aria objects and lets explicit flat attributes override inference', async () => {
		const rendered = await renderController(RenderControllerCard, {
			host: {
				aria: {
					labelledBy: 'controller-title',
				},
				class: ['render-controller-card-test', { emphasized: true }],
				data: {
					signal: 'armed',
				},
			},
			attributes: {
				'data-controller': 'flat-controller',
			},
			tagName: 'div',
		});

		expect(rendered.markup).toContain('class="render-controller-card-test emphasized"');
		expect(rendered.markup).toContain('aria-labelled-by="controller-title"');
		expect(rendered.markup).toContain('data-signal="armed"');
		expect(rendered.markup).toContain('data-controller="flat-controller"');
	});

	test('renderController() infers data-controller metadata from programmatic registration', async () => {
		const rendered = await renderController(ProgrammaticRenderControllerCard, {
			tagName: 'article',
		});

		expect(rendered.markup).toContain('data-controller="programmatic-render-controller-card"');
		expect(rendered.markup).toContain('Programmatic controller');
	});

	test('renderComponent() prepares authored content through a server render environment', async () => {
		const rendered = await renderComponent(RenderComponentSlotQueryCard, {
			authoredContent: '<h2 slot="header">Server heading</h2><p>Server body</p>',
			environment: createServerRenderEnvironment(),
		});

		expect(rendered.markup).toContain('data-header-slot="Server heading"');
		expect(rendered.markup).toContain('data-default-slot="Server body"');
		expect(rendered.markup).toContain('<header><h2 slot="header">Server heading</h2></header>');
		expect(rendered.markup).toContain('<div><p>Server body</p></div>');
	});

	test('renderComponent() lets adapters prepare host content before slot-aware SSR', async () => {
		const rendered = await renderComponent(RenderComponentSlotQueryCard, {
			prepareHost: (host) => {
				host.insertAdjacentHTML('beforeend', '<h2 slot="header">Prepared heading</h2><p>Prepared body</p>');
			},
		});

		expect(rendered.markup).toContain('data-header-slot="Prepared heading"');
		expect(rendered.markup).toContain('data-default-slot="Prepared body"');
		expect(rendered.markup).toContain('<header><h2 slot="header">Prepared heading</h2></header>');
	});

	test('renderComponent() exposes ambient SSR context to standalone consumers', async () => {
		const rendered = await renderComponent(RenderComponentContextCard, {
			ssrContext: [{ context: renderComponentContext, value: { label: 'SSR context value' } }],
		});

		expect(rendered.markup).toContain('data-context-provider="resolved"');
		expect(rendered.markup).toContain('SSR context value');
	});

	describeWhenStandard('provider hydration markup', () => {
		test('renderComponent() emits valid provider hydration markup without client-only fields', async () => {
			const rendered = await renderComponent(RenderComponentHydratedProvider, {
				initialize: (component) => {
					component.provider.setContext({ count: 5 });
				},
			});

			expect(rendered.markup).toContain(
				'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="provider">{"count":5}</script>',
			);
			expect(rendered.markup).not.toContain('&quot;');
			expect(rendered.markup).not.toContain('logger');
		});
	});

	test('renderComponentWithPreview() infers metadata and returns preview output', async () => {
		const now = new Date('2026-03-27T12:00:00.000Z');
		let resolvedComponent: CustomElementConstructor | undefined;

		const rendered = await renderComponentWithPreview(RenderComponentCard, {
			initialize: (component) => {
				component.count = 7;
				component.label = 'Configured label';
			},
			now: () => now,
			resolveClientModuleSrc: (component) => {
				resolvedComponent = component;
				return '/assets/render-component-card.js';
			},
		});

		expect(resolvedComponent).toBe(RenderComponentCard);
		expect(rendered.assets).toEqual(cardAssets);
		expect(rendered.generatedAt).toBe(now.toISOString());
		expect(rendered.clientModuleSrc).toBe('/assets/render-component-card.js');
		expect(rendered.tagName).toBe('render-component-card-test');
		expect(rendered.markup).toContain('<render-component-card-test');
		expect(rendered.markup).toContain('Count: 7');
		expect(rendered.markup).toContain('Configured label');
		expect(rendered.preview).toEqual(expect.any(Object));
	});

	test('renderComponentToPayload() accepts load() options and omits preview output', async () => {
		const payload = await renderComponentToPayload({
			load: async () => RenderComponentLoaderCard,
			initialize: (component) => {
				component.message = 'Loaded message';
			},
			clientModuleSrc: '/assets/loader-card.js',
		});

		expect(payload).toEqual({
			assets: [{ kind: 'script-module', src: '/assets/loader-card.js', stage: 'hydrate' }],
			clientModuleSrc: '/assets/loader-card.js',
			generatedAt: expect.any(String),
			markup: '<render-component-loader-card-test><p>Loaded message</p></render-component-loader-card-test>',
			tagName: 'render-component-loader-card-test',
		});
	});

	test('renderComponentToString() returns markup for constructor calls', async () => {
		const markup = await renderComponentToString(RenderComponentCard, {
			initialize: (component) => {
				component.count = 3;
				component.label = 'String only';
			},
		});

		expect(markup).toContain('<render-component-card-test');
		expect(markup).toContain('Count: 3');
		expect(markup).toContain('String only');
	});

	test('renderComponent() resolves explicit asset metadata', async () => {
		const rendered = await renderComponent(RenderComponentCard, {
			resolveAssets: () => [
				{ kind: 'style', href: '/assets/render-component-card.css' },
				{ kind: 'modulepreload', href: '/assets/render-component-card.js' },
			],
		});

		expect(rendered.metadata.assets).toEqual([
			{ kind: 'style', href: '/assets/render-component-card.css' },
			{ kind: 'modulepreload', href: '/assets/render-component-card.js' },
		]);
		expect(rendered.metadata.clientModuleUrl).toBeUndefined();
	});

	test('renderComponent() deduplicates clientModuleSrc when assets already contain the same script-module', async () => {
		const rendered = await renderComponent(RenderComponentCard, {
			clientModuleSrc: '/assets/render-component-card.js',
			assets: [
				{ kind: 'script-module', src: '/assets/render-component-card.js', stage: 'hydrate' },
				{ kind: 'style', href: '/assets/render-component-card.css' },
			],
		});

		expect(rendered.metadata.assets).toEqual([
			{ kind: 'script-module', src: '/assets/render-component-card.js', stage: 'hydrate' },
			{ kind: 'style', href: '/assets/render-component-card.css' },
		]);
	});

	test('renderComponent() prepends clientModuleSrc when assets do not contain it', async () => {
		const rendered = await renderComponent(RenderComponentCard, {
			clientModuleSrc: '/assets/render-component-card.js',
			assets: [{ kind: 'style', href: '/assets/render-component-card.css' }],
		});

		expect(rendered.metadata.assets).toEqual([
			{ kind: 'script-module', src: '/assets/render-component-card.js', stage: 'hydrate' },
			{ kind: 'style', href: '/assets/render-component-card.css' },
		]);
	});

	test('scriptModuleAsset() creates a script-module asset with default stage', () => {
		expect(scriptModuleAsset('/entry.js')).toEqual({ kind: 'script-module', src: '/entry.js', stage: 'hydrate' });
		expect(scriptModuleAsset('/entry.js', 'idle')).toEqual({
			kind: 'script-module',
			src: '/entry.js',
			stage: 'idle',
		});
	});

	test('modulePreloadAsset() creates a modulepreload asset', () => {
		expect(modulePreloadAsset('/dep.js')).toEqual({ kind: 'modulepreload', href: '/dep.js' });
	});

	test('styleAsset() creates a style asset with optional media', () => {
		expect(styleAsset('/style.css')).toEqual({ kind: 'style', href: '/style.css' });
		expect(styleAsset('/print.css', 'print')).toEqual({ kind: 'style', href: '/print.css', media: 'print' });
	});

	test('renderComponentWithPreview() throws when tag metadata is missing', async () => {
		class UntaggedRenderable implements ServerRenderableComponent {
			renderHostToString(): string {
				return '<untagged-renderable></untagged-renderable>';
			}
		}

		await expect(
			renderComponentWithPreview(
				UntaggedRenderable as unknown as CustomElementConstructor & { new (): UntaggedRenderable },
			),
		).rejects.toThrow('UntaggedRenderable is missing @customElement metadata.');
	});

	test('renderComponent() rejects host preparation for non-element renderables', async () => {
		class StringOnlyRenderable implements ServerRenderableComponent {
			renderHostToString(): string {
				return '<string-only-renderable></string-only-renderable>';
			}
		}

		await expect(
			renderComponent(
				StringOnlyRenderable as unknown as CustomElementConstructor & { new (): StringOnlyRenderable },
				{
					prepareHost: () => {},
				},
			),
		).rejects.toThrow(
			'StringOnlyRenderable cannot prepare SSR host content because it does not expose an innerHTML host surface.',
		);
	});

	test('concurrent renders resolve independent SSR context values', async () => {
		const concurrentContext = createContext<{ id: number }>(Symbol('concurrent-context'));

		@customElement('concurrent-context-card-test')
		class ConcurrentContextCard extends RadiantElement {
			@consumeContext(concurrentContext) provider!: ContextProvider<typeof concurrentContext>;

			@onContextUpdate({ context: concurrentContext, select: (ctx) => ctx.id, subscribe: false })
			applyId(id: number) {
				this.setAttribute('data-id', String(id));
			}

			override render() {
				return <p data-id={this.getAttribute('data-id') ?? 'missing'}>Card</p>;
			}
		}

		const [markupA, markupB] = await Promise.all([
			renderComponentToString(ConcurrentContextCard, {
				ssrContext: [{ context: concurrentContext, value: { id: 1 } }],
			}),
			renderComponentToString(ConcurrentContextCard, {
				ssrContext: [{ context: concurrentContext, value: { id: 2 } }],
			}),
		]);

		expect(markupA).toContain('data-id="1"');
		expect(markupB).toContain('data-id="2"');
	});
});
