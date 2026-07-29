import type { JsxRenderable } from '@ecopages/jsx';
import { createMarkupNodeLike } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import type { SsrSerializableContextProvider } from '../../context/context-provider';
import { runWithSsrProviderStack, withSsrContextProviders } from '../context-ssr';
import '../install/install-ssr-runtime';
import type { ContextType, UnknownContext } from '../../context/types';
import { getCustomElementTagName } from '../../core/custom-element-metadata';
import { assertValidHtmlTagName } from '../../utils/html-names';
import { alignMinimalDomHostTagName } from '../shim/minimal-dom/align-host-tag-name';
import { ensureLegacyHostReady } from '../../decorators/legacy/host-readiness';
import { createServerRenderEnvironment, type ServerRenderEnvironment } from '../shim/light-dom-shim';
import {
	getOrCreateRadiantElementSsrRuntime,
	renderRegisteredRadiantElementHost,
	renderRegisteredRadiantElementHostToString,
} from '../radiant-element-ssr';
import { withRadiantElementSsrRuntime } from '../../core/radiant-element-ssr-registry';
import {
	createDefaultRenderTimestamp,
	mergeRenderedComponentAssets,
	normalizeRenderOptions,
	resolvePrimaryClientModuleSrc,
	toRenderedComponentPayload,
	toRenderedComponentWithPreview,
} from './render-shared';
import type {
	RenderedComponent,
	RenderedComponentAsset,
	RenderedComponentPayload,
	RenderedComponentWithPreview,
} from './render-types';

export {
	createDefaultRenderTimestamp,
	mergeRenderedComponentAssets,
	normalizeRenderOptions,
	resolvePrimaryClientModuleSrc,
	toRenderedComponentPayload,
	toRenderedComponentWithPreview,
} from './render-shared';
export {
	modulePreloadAsset,
	scriptModuleAsset,
	styleAsset,
	type RenderedComponent,
	type RenderedComponentAsset,
	type RenderedComponentMetadata,
	type RenderedComponentPayload,
	type RenderedComponentWithPreview,
} from './render-types';

/** Minimal component contract needed for framework-agnostic SSR helpers. */
export type ServerRenderableComponent = object;

/** Constructor shape for a server-renderable component. */
export type ServerRenderableComponentConstructor<TComponent extends ServerRenderableComponent> =
	CustomElementConstructor & {
		new (): TComponent;
	};

/**
 * Resolves the browser-importable client module URL for a component constructor.
 *
 * Use this when the server adapter can derive the client entry lazily instead of
 * hardcoding `clientModuleSrc` for every render call.
 */
export type ResolveRenderedComponentClientModule<TComponent extends ServerRenderableComponent> = (
	component: ServerRenderableComponentConstructor<TComponent>,
) => string | undefined | Promise<string | undefined>;

/**
 * Resolves fragment assets for a component constructor.
 *
 * Prefer this over `resolveClientModuleSrc(...)` for new adapters so assets can
 * describe scripts, styles, and preload hints through one transport-agnostic shape.
 */
export type ResolveRenderedComponentAssets<TComponent extends ServerRenderableComponent> = (
	component: ServerRenderableComponentConstructor<TComponent>,
) => readonly RenderedComponentAsset[] | undefined | Promise<readonly RenderedComponentAsset[] | undefined>;

/**
 * Prepares a component host before SSR so slot-aware logic can observe authored
 * light-DOM content during render.
 */
export type PrepareRenderedComponentHost<TComponent extends ServerRenderableComponent> = (
	host: TComponent & HTMLElement,
	environment: ServerRenderEnvironment,
) => void;

/**
 * Ambient SSR context value visible while a standalone component render runs.
 *
 * This lets adapters provide ancestor-like context to `consumeContext(...)` and
 * `contextSelector(...)` without needing to instantiate a real provider host.
 */
export type RenderComponentSsrContextEntry<TContext extends UnknownContext = UnknownContext> = {
	context: TContext;
	value: ContextType<TContext>;
};

type RenderComponentSharedOptions<TComponent extends ServerRenderableComponent> = {
	/** Asset dependencies required by the rendered fragment. */
	assets?: readonly RenderedComponentAsset[];
	/** Serialized authored light-DOM content to attach to the host before rendering.
	 *
	 * Treated as trusted author HTML (same trust model as `innerHTML` /
	 * `insertAdjacentHTML`). Do not pass untrusted user input.
	 */
	authoredContent?: string;
	/** Browser-importable client module URL used to register the component before hydration. */
	clientModuleSrc?: string;
	/** Initializes the component instance before the host is rendered. */
	initialize?: (component: TComponent) => void;
	/** SSR environment responsible for preparing the host runtime and authored content. */
	environment?: ServerRenderEnvironment;
	/**
	 * Dedicated host-preparation hook for slot-aware SSR.
	 *
	 * Use this when the server needs to append or mutate authored light-DOM
	 * nodes directly instead of passing `authoredContent` as a string.
	 *
	 * Authored mutations are trusted author-controlled HTML/DOM — not for
	 * untrusted user input.
	 */
	prepareHost?: PrepareRenderedComponentHost<TComponent>;
	/**
	 * Ambient SSR context entries that should be visible while the component is
	 * instantiated and rendered.
	 *
	 * This solves standalone fragment renders that need to consume context from a
	 * parent-like server environment.
	 */
	ssrContext?: readonly RenderComponentSsrContextEntry[];
	/** Clock override used by tests and adapters that need deterministic timestamps. */
	now?: () => Date;
	/** JSX server-renderer options forwarded to the Radiant host serializer. */
	renderOptions?: RenderToStringOptions;
	/** Lazy asset resolver used when `assets` are not provided directly. */
	resolveAssets?: ResolveRenderedComponentAssets<TComponent>;
	/** Lazy client-module resolver used when `clientModuleSrc` is not provided directly. */
	resolveClientModuleSrc?: ResolveRenderedComponentClientModule<TComponent>;
	/** Explicit tag-name override when `@customElement(...)` metadata is not desired. */
	tagName?: string;
};

/** Options accepted by the reusable SSR component rendering helpers. */
export type RenderComponentOptions<TComponent extends ServerRenderableComponent> =
	RenderComponentSharedOptions<TComponent> &
		(
			| {
					component: ServerRenderableComponentConstructor<TComponent>;
			  }
			| {
					load: () => Promise<ServerRenderableComponentConstructor<TComponent>>;
			  }
		);

/** Call-site options used when the component constructor is passed directly. */
export type RenderComponentCallOptions<TComponent extends ServerRenderableComponent> =
	RenderComponentSharedOptions<TComponent>;

/**
 * Serializes a custom element into HTML, inferring its tag name from
 * `@customElement(...)` metadata when the caller does not provide one.
 */
export function renderComponentToString<TComponent extends ServerRenderableComponent>(
	component: ServerRenderableComponentConstructor<TComponent>,
	options?: RenderComponentCallOptions<TComponent>,
): Promise<string>;

export function renderComponentToString<TComponent extends ServerRenderableComponent>(
	options: RenderComponentOptions<TComponent>,
): Promise<string>;

export async function renderComponentToString<TComponent extends ServerRenderableComponent>(
	componentOrOptions: ServerRenderableComponentConstructor<TComponent> | RenderComponentOptions<TComponent>,
	options?: RenderComponentCallOptions<TComponent>,
): Promise<string> {
	return (await renderResolvedComponent(normalizeRenderComponentOptions(componentOrOptions, options))).markup;
}

/**
 * Renders a custom element into the canonical portable server-rendered shape,
 * separating transport-agnostic metadata from any HTTP-specific adapter.
 */
export function renderComponent<TComponent extends ServerRenderableComponent>(
	component: ServerRenderableComponentConstructor<TComponent>,
	options?: RenderComponentCallOptions<TComponent>,
): Promise<RenderedComponent>;

export function renderComponent<TComponent extends ServerRenderableComponent>(
	options: RenderComponentOptions<TComponent>,
): Promise<RenderedComponent>;

export async function renderComponent<TComponent extends ServerRenderableComponent>(
	componentOrOptions: ServerRenderableComponentConstructor<TComponent> | RenderComponentOptions<TComponent>,
	options?: RenderComponentCallOptions<TComponent>,
): Promise<RenderedComponent> {
	return renderResolvedComponent(normalizeRenderComponentOptions(componentOrOptions, options));
}

/**
 * Serializes a custom element into a fragment payload that frameworks can
 * attach to any response shape they prefer.
 */
export function renderComponentToPayload<TComponent extends ServerRenderableComponent>(
	component: ServerRenderableComponentConstructor<TComponent>,
	options?: RenderComponentCallOptions<TComponent>,
): Promise<RenderedComponentPayload>;

export function renderComponentToPayload<TComponent extends ServerRenderableComponent>(
	options: RenderComponentOptions<TComponent>,
): Promise<RenderedComponentPayload>;

export async function renderComponentToPayload<TComponent extends ServerRenderableComponent>(
	componentOrOptions: ServerRenderableComponentConstructor<TComponent> | RenderComponentOptions<TComponent>,
	options?: RenderComponentCallOptions<TComponent>,
): Promise<RenderedComponentPayload> {
	return toRenderedComponentPayload(
		await renderResolvedComponent(normalizeRenderComponentOptions(componentOrOptions, options)),
	);
}

/**
 * Renders a component into both fragment metadata and a JSX-compatible preview
 * value that can be embedded into a larger server-rendered shell.
 */
export function renderComponentWithPreview<TComponent extends ServerRenderableComponent>(
	component: ServerRenderableComponentConstructor<TComponent>,
	options?: RenderComponentCallOptions<TComponent>,
): Promise<RenderedComponentWithPreview>;

export function renderComponentWithPreview<TComponent extends ServerRenderableComponent>(
	options: RenderComponentOptions<TComponent>,
): Promise<RenderedComponentWithPreview>;

export async function renderComponentWithPreview<TComponent extends ServerRenderableComponent>(
	componentOrOptions: ServerRenderableComponentConstructor<TComponent> | RenderComponentOptions<TComponent>,
	options?: RenderComponentCallOptions<TComponent>,
): Promise<RenderedComponentWithPreview> {
	return toRenderedComponentWithPreview(
		await renderResolvedComponent(normalizeRenderComponentOptions(componentOrOptions, options)),
	);
}

/**
 * Resolves assets and options, then renders one component host.
 * Async I/O stays outside SSR scope; the scoped callback is the sync snapshot only.
 */
async function renderResolvedComponent<TComponent extends ServerRenderableComponent>(
	normalizedOptions: RenderComponentOptions<TComponent>,
): Promise<RenderedComponent> {
	const environment = normalizedOptions.environment ?? createServerRenderEnvironment();
	const Component = 'component' in normalizedOptions ? normalizedOptions.component : await normalizedOptions.load();
	const resolvedClientModuleSrc =
		normalizedOptions.clientModuleSrc ?? (await normalizedOptions.resolveClientModuleSrc?.(Component));
	const resolvedAssets = normalizedOptions.assets ?? (await normalizedOptions.resolveAssets?.(Component)) ?? [];
	const assets = mergeRenderedComponentAssets(resolvedAssets, resolvedClientModuleSrc);
	const clientModuleSrc = resolvePrimaryClientModuleSrc(assets) ?? resolvedClientModuleSrc;
	const tagName = assertValidHtmlTagName(
		normalizedOptions.tagName ?? resolveRenderedComponentTagName(Component),
		'Component SSR host tagName',
	);
	const generatedAt = (normalizedOptions.now ?? createDefaultRenderTimestamp)().toISOString();
	const renderOptions = normalizeRenderOptions(normalizedOptions.renderOptions);

	return withRadiantElementSsrRuntime(getOrCreateRadiantElementSsrRuntime(), () =>
		runWithSsrProviderStack(() =>
			withSsrContextProviders(createAmbientSsrContextProviders(normalizedOptions.ssrContext), () => {
				const component = new Component();
				alignMinimalDomHostTagName(component, tagName);
				ensureLegacyHostReady(component, 'ssr');
				prepareRenderedComponentHost(
					environment,
					component,
					normalizedOptions.authoredContent,
					normalizedOptions.prepareHost,
				);
				normalizedOptions.initialize?.(component);

				const markup = requireRegisteredRadiantElementMarkup(component, renderOptions);
				const preview = resolveRenderedComponentPreview(component, markup);

				return {
					markup,
					metadata: {
						assets,
						clientModuleUrl: clientModuleSrc,
						generatedAt,
						tagName,
					},
					preview,
				};
			}),
		),
	);
}

/**
 * Chooses the preview renderable returned by `renderComponent()`.
 *
 * Falls back to the serialized host markup when a generic server-renderable
 * component does not expose a JSX preview surface.
 */
function resolveRenderedComponentPreview<TComponent extends ServerRenderableComponent>(
	component: TComponent,
	markup: string,
): JsxRenderable {
	return renderRegisteredRadiantElementHost(component) ?? createMarkupNodeLike(markup);
}

function prepareRenderedComponentHost<TComponent extends ServerRenderableComponent>(
	environment: ServerRenderEnvironment,
	component: TComponent,
	authoredContent: string | undefined,
	prepareHost: PrepareRenderedComponentHost<TComponent> | undefined,
): void {
	if (!canPrepareSsrHost(component)) {
		if (authoredContent === undefined && prepareHost === undefined) {
			return;
		}

		throw new Error(
			`${component.constructor.name} cannot prepare SSR host content because it does not expose an innerHTML host surface.`,
		);
	}

	environment.prepareHost(component, { authoredContent });
	prepareHost?.(component, environment);
}

/**
 * Wraps ad-hoc `ssrContext` values in provider-like objects so the existing SSR
 * context stack can resolve them exactly like real ancestor providers.
 */
function createAmbientSsrContextProviders(
	entries: readonly RenderComponentSsrContextEntry[] | undefined,
): SsrSerializableContextProvider[] {
	if (!entries || entries.length === 0) {
		return [];
	}

	return entries.map((entry) => ({
		getContext: () => entry.value,
		getContextKey: () => entry.context,
		renderHydrationScript: () => undefined,
		renderHydrationScriptTag: () => undefined,
	}));
}

function normalizeRenderComponentOptions<TComponent extends ServerRenderableComponent>(
	componentOrOptions: ServerRenderableComponentConstructor<TComponent> | RenderComponentOptions<TComponent>,
	options?: RenderComponentCallOptions<TComponent>,
): RenderComponentOptions<TComponent> {
	if (typeof componentOrOptions === 'function') {
		return {
			...options,
			component: componentOrOptions,
		};
	}

	return componentOrOptions;
}

function canPrepareSsrHost<TComponent extends ServerRenderableComponent>(
	component: TComponent,
): component is TComponent & HTMLElement {
	return 'innerHTML' in component;
}

function requireRegisteredRadiantElementMarkup<TComponent extends ServerRenderableComponent>(
	component: TComponent,
	options: RenderToStringOptions,
): string {
	const markup = renderRegisteredRadiantElementHostToString(component, options);

	if (markup !== undefined) {
		return markup;
	}

	throw new Error(
		`${component.constructor.name} cannot be server-rendered without a registered Radiant SSR host. Use a RadiantElement subclass and import a Radiant server SSR entrypoint.`,
	);
}

function resolveRenderedComponentTagName(target: CustomElementConstructor): string {
	const tagName = getCustomElementTagName(target);

	if (!tagName) {
		throw new Error(`${target.name} is missing @customElement metadata.`);
	}

	return tagName;
}
