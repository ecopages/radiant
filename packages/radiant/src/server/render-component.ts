import type { JsxRenderable } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import { withSsrContextProviders } from './context-ssr';
import type { ContextType, UnknownContext } from '../context/types';
import { getCustomElementTagName } from '../core/custom-element-metadata';
import { createServerRenderEnvironment, type ServerRenderEnvironment } from './light-dom-shim';
import {
	resolveRegisteredRadiantElementPreview,
	renderRegisteredRadiantElementHost,
	renderRegisteredRadiantElementHostToString,
} from './radiant-component-ssr-bridge';
import { ensureRadiantElementSsrRuntimeRegistered } from './radiant-component-ssr-runtime';

ensureRadiantElementSsrRuntimeRegistered();

/** Asset dependency emitted by a rendered fragment. */
export type RenderedComponentAsset =
	| {
			/** Browser module specifier that must be loaded to activate the fragment. */
			kind: 'script-module';
			/** Runtime loading policy for the module. */
			stage?: 'hydrate' | 'idle' | 'immediate';
			/** Module specifier or browser-importable URL. */
			src: string;
	  }
	| {
			/** Module graph preload hint for adapters that control the document head. */
			kind: 'modulepreload';
			/** Module specifier or browser-importable URL. */
			href: string;
	  }
	| {
			/** Stylesheet dependency required by the rendered fragment. */
			kind: 'style';
			/** Browser-importable stylesheet URL. */
			href: string;
			/** Optional media query applied to the stylesheet link. */
			media?: string;
	  };

/** Creates a module asset entry for a rendered fragment. */
export function scriptModuleAsset(
	src: string,
	stage: 'hydrate' | 'idle' | 'immediate' = 'hydrate',
): RenderedComponentAsset {
	return { kind: 'script-module', src, stage };
}

/** Creates a modulepreload hint for a rendered fragment. */
export function modulePreloadAsset(href: string): RenderedComponentAsset {
	return { kind: 'modulepreload', href };
}

/** Creates a stylesheet asset entry for a rendered fragment. */
export function styleAsset(href: string, media?: string): RenderedComponentAsset {
	return media ? { kind: 'style', href, media } : { kind: 'style', href };
}

/** Portable metadata for a server-rendered custom-element fragment. */
export type RenderedComponentMetadata = {
	/** Asset dependencies required by the rendered fragment. */
	assets: readonly RenderedComponentAsset[];
	/** Browser-importable client module URL used to register the component before hydration. */
	clientModuleUrl?: string;
	/** ISO timestamp describing when the fragment was rendered. */
	generatedAt: string;
	/** Custom-element tag name emitted at the fragment root. */
	tagName: string;
};

/** Canonical server render result returned by `renderComponent()`. */
export type RenderedComponent = {
	/** Serialized custom-element host markup. */
	markup: string;
	/** Transport-agnostic metadata that adapters can map onto headers or JSON. */
	metadata: RenderedComponentMetadata;
	/** JSX-compatible preview value that can be embedded into a larger SSR shell. */
	preview: JsxRenderable;
};

/** Serializable metadata for a server-rendered custom-element fragment. */
export type RenderedComponentPayload = {
	/** Asset dependencies required by the rendered fragment. */
	assets?: readonly RenderedComponentAsset[];
	/** Browser-importable client module URL used to register the component before hydration. */
	clientModuleSrc?: string;
	/** ISO timestamp describing when the fragment was rendered. */
	generatedAt: string;
	/** Serialized custom-element host markup. */
	markup: string;
	/** Custom-element tag name emitted at the fragment root. */
	tagName: string;
};

/** Full SSR result including a JSX-compatible preview value for shell composition. */
export type RenderedComponentWithPreview = RenderedComponentPayload & {
	/** JSX-compatible preview value that can be embedded into a larger SSR shell. */
	preview: JsxRenderable;
};

/** Minimal component contract needed for framework-agnostic SSR helpers. */
export type ServerRenderableComponent = {
	renderHost?: () => JsxRenderable;
	renderHostToString: (options?: RenderToStringOptions) => string;
};

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
	/** Serialized authored light-DOM content to attach to the host before rendering. */
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
	/** JSX server-renderer options forwarded to `renderHostToString()`. */
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

async function renderResolvedComponent<TComponent extends ServerRenderableComponent>(
	normalizedOptions: RenderComponentOptions<TComponent>,
): Promise<RenderedComponent> {
	ensureRadiantElementSsrRuntimeRegistered();

	const environment = normalizedOptions.environment ?? createServerRenderEnvironment();
	const restoreAmbientContext = withSsrContextProviders(
		createAmbientSsrContextProviders(normalizedOptions.ssrContext),
	);

	try {
		const Component =
			'component' in normalizedOptions ? normalizedOptions.component : await normalizedOptions.load();
		const component = new Component();
		prepareRenderedComponentHost(
			environment,
			component,
			normalizedOptions.authoredContent,
			normalizedOptions.prepareHost,
		);
		normalizedOptions.initialize?.(component);

		const resolvedClientModuleSrc =
			normalizedOptions.clientModuleSrc ?? (await normalizedOptions.resolveClientModuleSrc?.(Component));
		const resolvedAssets = normalizedOptions.assets ?? (await normalizedOptions.resolveAssets?.(Component)) ?? [];
		const assets = mergeRenderedComponentAssets(resolvedAssets, resolvedClientModuleSrc);
		const clientModuleSrc = resolvePrimaryClientModuleSrc(assets) ?? resolvedClientModuleSrc;
		const tagName = normalizedOptions.tagName ?? resolveRenderedComponentTagName(Component);
		const generatedAt = (normalizedOptions.now ?? createDefaultRenderTimestamp)().toISOString();
		const renderOptions = normalizeRenderOptions(normalizedOptions.renderOptions);
		const markup =
			renderRegisteredRadiantElementHostToString(component, renderOptions) ??
			component.renderHostToString(renderOptions);
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
	} finally {
		restoreAmbientContext();
	}
}

/**
 * Chooses the preview renderable returned by `renderComponent()`.
 *
 * When a component overrides only `renderHostToString()`, the inherited
 * `renderHost()` implementation would otherwise generate a different preview
 * tree than the final serialized markup. In that case the preview falls back to
 * the already-computed markup so shell composition stays aligned with the real
 * SSR output.
 */
function resolveRenderedComponentPreview<TComponent extends ServerRenderableComponent>(
	component: TComponent,
	markup: string,
): JsxRenderable {
	return (
		resolveRegisteredRadiantElementPreview(component, markup) ??
		renderRegisteredRadiantElementHost(component) ??
		component.renderHost?.() ?? { nodeType: 1, outerHTML: markup }
	);
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

/**
 * Drops the preview renderable so the result can be sent through lightweight
 * framework adapters or JSON/HTML fragment endpoints.
 */
export function toRenderedComponentPayload(
	render: RenderedComponentWithPreview | RenderedComponent,
): RenderedComponentPayload {
	if ('metadata' in render) {
		return {
			assets: render.metadata.assets,
			clientModuleSrc: render.metadata.clientModuleUrl,
			generatedAt: render.metadata.generatedAt,
			markup: render.markup,
			tagName: render.metadata.tagName,
		};
	}

	const { preview: _preview, ...payload } = render;
	return payload;
}
function toRenderedComponentWithPreview(render: RenderedComponent): RenderedComponentWithPreview {
	return {
		assets: render.metadata.assets,
		clientModuleSrc: render.metadata.clientModuleUrl,
		generatedAt: render.metadata.generatedAt,
		markup: render.markup,
		preview: render.preview,
		tagName: render.metadata.tagName,
	};
}

function createDefaultRenderTimestamp(): Date {
	return new Date();
}

function createRenderedComponentClientModuleAssets(
	clientModuleSrc: string | undefined,
): readonly RenderedComponentAsset[] {
	if (!clientModuleSrc) {
		return [];
	}

	return [scriptModuleAsset(clientModuleSrc)];
}

export function mergeRenderedComponentAssets(
	assets: readonly RenderedComponentAsset[],
	clientModuleSrc: string | undefined,
): readonly RenderedComponentAsset[] {
	if (!clientModuleSrc) {
		return assets;
	}

	if (assets.some((asset) => asset.kind === 'script-module' && asset.src === clientModuleSrc)) {
		return assets;
	}

	return [...createRenderedComponentClientModuleAssets(clientModuleSrc), ...assets];
}

export function resolvePrimaryClientModuleSrc(assets: readonly RenderedComponentAsset[]): string | undefined {
	return assets.find((asset) => asset.kind === 'script-module')?.src;
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

export function normalizeRenderOptions(options: RenderToStringOptions | undefined): RenderToStringOptions {
	if (options?.mode !== undefined || options?.hydrate !== undefined) {
		return options;
	}

	return {
		...options,
		mode: 'hydrate',
	};
}

function canPrepareSsrHost<TComponent extends ServerRenderableComponent>(
	component: TComponent,
): component is TComponent & HTMLElement {
	return 'innerHTML' in component;
}

function resolveRenderedComponentTagName(target: CustomElementConstructor): string {
	const tagName = getCustomElementTagName(target);

	if (!tagName) {
		throw new Error(`${target.name} is missing @customElement metadata.`);
	}

	return tagName;
}
