import '@ecopages/radiant/server/install-ssr-runtime';
import type { ViteDevServer } from 'vite';
import type { JsxRenderable } from '@ecopages/jsx';
import { renderToString } from '@ecopages/jsx/server';
import type { RenderedComponent } from '@ecopages/radiant/server/render-component';
import { composeStoryRender } from './compose-story-render';
import { applyStoryArgs, getCustomElementTagName, pickComponentExport } from './host';
import { extractHostInnerHtml } from './ssr-markup';
import { normalizeSsrModulePath } from './ssr-module-path';
import { resolveScriptSsrModule } from './resolve-script-module';
import { collectSsrStyleAssets } from './collect-ssr-styles';
import type { RadiantSsrAsset, RadiantSsrRequestBody } from './constants';

type RenderSsrComponent = (
	component: CustomElementConstructor,
	options?: {
		authoredContent?: string;
		clientModuleSrc?: string;
		initialize?: (instance: unknown) => void;
		renderOptions?: { mode?: 'hydrate' | 'plain' };
	},
) => Promise<RenderedComponent>;

async function loadRenderSsrComponent(server: ViteDevServer): Promise<RenderSsrComponent> {
	const mod = (await server.ssrLoadModule('@ecopages/vite-plugin-radiant/ssr')) as {
		renderSsrComponent: RenderSsrComponent;
	};
	return mod.renderSsrComponent;
}

export async function resolveStoryArgs(
	server: ViteDevServer,
	storyModule: string | undefined,
	storyExport: string | undefined,
	overrides: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
	if (!storyModule) {
		return overrides;
	}

	const mod = (await server.ssrLoadModule(normalizeSsrModulePath(storyModule))) as Record<string, unknown>;
	const meta = mod.default as { args?: Record<string, unknown> } | undefined;
	const story = storyExport ? (mod[storyExport] as { args?: Record<string, unknown> } | undefined) : undefined;
	const base = {
		...(meta?.args ?? {}),
		...(story?.args ?? {}),
	};

	if (Object.keys(overrides).length === 0) {
		return base;
	}

	return applyControlOverrides(base, overrides);
}

/**
 * Merges Storybook control overrides onto CSF module args for SSR.
 *
 * @remarks
 * Arrays of plain objects are deep-merged by index (option lists). Nested arrays
 * and primitives replace wholesale — spreading an array into an object turns
 * `['Mon','Tue']` into `{0:'Mon',1:'Tue'}`, which then breaks `.map`.
 */
export function applyControlOverrides(
	base: Record<string, unknown>,
	overrides: Record<string, unknown>,
): Record<string, unknown> {
	const merged = { ...base };

	for (const [key, value] of Object.entries(overrides)) {
		if (value === undefined) {
			continue;
		}

		if (Array.isArray(value) && Array.isArray(merged[key])) {
			const baseItems = merged[key] as unknown[];

			if (!canDeepMergeArrayItems(baseItems, value)) {
				merged[key] = value;
				continue;
			}

			merged[key] = baseItems.map((baseItem, index) => {
				const overrideItem = value[index];
				if (!overrideItem || typeof overrideItem !== 'object' || !baseItem || typeof baseItem !== 'object') {
					return overrideItem === undefined ? baseItem : overrideItem;
				}

				return { ...(baseItem as Record<string, unknown>), ...(overrideItem as Record<string, unknown>) };
			});
			continue;
		}

		merged[key] = value;
	}

	return merged;
}

function canDeepMergeArrayItems(baseItems: readonly unknown[], overrideItems: readonly unknown[]): boolean {
	return baseItems.every(isPlainObject) && overrideItems.every((item) => item === undefined || isPlainObject(item));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export async function renderViewAuthoredContent(
	server: ViteDevServer,
	viewModule: string,
	viewExport: string | undefined,
	args: Record<string, unknown>,
	mode: 'hydrate' | 'plain',
	storyModule?: string,
	storyExport?: string,
): Promise<string | undefined> {
	const mod = (await server.ssrLoadModule(normalizeSsrModulePath(viewModule))) as Record<string, unknown>;
	const view = viewExport ? mod[viewExport] : mod.default;

	if (typeof view !== 'function') {
		throw new Error(`View export "${viewExport ?? 'default'}" was not found in ${viewModule}`);
	}

	const storyRender = await resolveStoryRender(server, storyModule, storyExport);
	const rendered = await renderToString((storyRender ?? view)(args), { mode });
	const linkedElement = (view as unknown as { [key: symbol]: CustomElementConstructor | undefined })[
		Symbol.for('@ecopages/storybook-radiant.viewElement')
	];
	const tagName = linkedElement ? getCustomElementTagName(linkedElement) : undefined;

	if (!tagName) {
		return rendered;
	}

	return extractHostInnerHtml(rendered, tagName);
}

async function resolveStoryRender(
	server: ViteDevServer,
	storyModule: string | undefined,
	storyExport: string | undefined,
): Promise<((args: Record<string, unknown>) => JsxRenderable) | undefined> {
	if (!storyModule) {
		return undefined;
	}

	const mod = (await server.ssrLoadModule(normalizeSsrModulePath(storyModule))) as Record<string, unknown>;
	const meta = mod.default as { render?: unknown } | undefined;
	const story = storyExport ? (mod[storyExport] as { render?: unknown } | undefined) : undefined;
	const render = story?.render ?? meta?.render;

	return typeof render === 'function' ? (render as (args: Record<string, unknown>) => JsxRenderable) : undefined;
}

function mergeSsrAssets(...groups: readonly (readonly RadiantSsrAsset[])[]): RadiantSsrAsset[] {
	const merged: RadiantSsrAsset[] = [];
	const seen = new Set<string>();

	for (const group of groups) {
		for (const asset of group) {
			const key =
				asset.kind === 'script-module'
					? `script:${asset.src}`
					: asset.kind === 'modulepreload'
						? `preload:${asset.href}`
						: `style:${asset.href}:${asset.media ?? ''}`;

			if (seen.has(key)) {
				continue;
			}

			seen.add(key);
			merged.push(asset);
		}
	}

	return merged;
}

export async function renderStorybookSsrPayload(
	server: ViteDevServer,
	body: RadiantSsrRequestBody,
	options: { globalStyleModules?: readonly string[] } = {},
): Promise<{
	markup: string;
	tagName: string;
	assets: RadiantSsrAsset[];
	clientModuleSrc?: string;
	generatedAt: string;
}> {
	const args = await resolveStoryArgs(server, body.storyModule, body.storyExport, body.args ?? {});
	const mode = body.mode ?? 'hydrate';
	return body.kind === 'jsx'
		? renderJsxSsrPayload(server, body, args, mode, options)
		: renderHostSsrPayload(server, body, args, mode, options);
}

async function renderJsxSsrPayload(
	server: ViteDevServer,
	body: RadiantSsrRequestBody,
	args: Record<string, unknown>,
	mode: 'hydrate' | 'plain',
	options: { globalStyleModules?: readonly string[] },
): Promise<{
	markup: string;
	tagName: string;
	assets: RadiantSsrAsset[];
	clientModuleSrc?: string;
	generatedAt: string;
}> {
	const markup = await renderStoryMarkup(server, body.storyModule, body.storyExport, args, mode);
	return {
		markup,
		tagName: '',
		assets: await collectPlainStoryAssets(server, body.storyModule, mode, options),
		clientModuleSrc: body.storyModule,
		generatedAt: new Date().toISOString(),
	};
}

async function renderHostSsrPayload(
	server: ViteDevServer,
	body: RadiantSsrRequestBody,
	args: Record<string, unknown>,
	mode: 'hydrate' | 'plain',
	options: { globalStyleModules?: readonly string[] },
): Promise<{
	markup: string;
	tagName: string;
	assets: RadiantSsrAsset[];
	clientModuleSrc?: string;
	generatedAt: string;
}> {
	const { ssrModule, ssrExport } = await resolveScriptSsrModule(server, {
		ssrModule: body.ssrModule,
		ssrExport: body.ssrExport,
		viewModule: body.viewModule,
		viewExport: body.viewExport,
	});
	const renderSsrComponent = await loadRenderSsrComponent(server);
	const mod = (await server.ssrLoadModule(ssrModule)) as Record<string, unknown>;
	const Component = pickComponentExport(mod, ssrExport);
	const tagName = getCustomElementTagName(Component) ?? Component.name.toLowerCase();

	const authoredContent = await resolveAuthoredContent(server, body, args, mode);

	const rendered = await renderSsrComponent(Component, {
		authoredContent,
		clientModuleSrc: body.viewModule ?? ssrModule,
		renderOptions: { mode },
		initialize: (instance) => {
			applyStoryArgs(instance as object, args);
		},
	});

	const styleAssets = await collectPlainStoryAssets(server, [ssrModule, body.viewModule], mode, options);

	return {
		markup: rendered.markup,
		tagName: rendered.metadata.tagName ?? tagName,
		assets: mergeSsrAssets(rendered.metadata.assets, styleAssets),
		clientModuleSrc: body.viewModule ?? rendered.metadata.clientModuleUrl ?? ssrModule,
		generatedAt: rendered.metadata.generatedAt,
	};
}

async function resolveAuthoredContent(
	server: ViteDevServer,
	body: RadiantSsrRequestBody,
	args: Record<string, unknown>,
	mode: 'hydrate' | 'plain',
): Promise<string | undefined> {
	if (!body.viewModule) return undefined;
	const authoredContent = await renderViewAuthoredContent(
		server,
		body.viewModule,
		body.viewExport,
		args,
		mode,
		body.storyModule,
		body.storyExport,
	);
	if (authoredContent?.trim()) return authoredContent;
	const itemCount = Array.isArray(args.items) ? args.items.length : 0;
	throw new Error(
		`View SSR produced empty authored content for ${body.viewModule} (items=${itemCount}, args=${Object.keys(args).join(',')})`,
	);
}

async function collectPlainStoryAssets(
	server: ViteDevServer,
	modules: string | readonly (string | undefined)[] | undefined,
	mode: 'hydrate' | 'plain',
	options: { globalStyleModules?: readonly string[] },
): Promise<RadiantSsrAsset[]> {
	const modulePaths = (typeof modules === 'string' ? [modules] : (modules ?? [])).filter((entry): entry is string =>
		Boolean(entry),
	);
	if (mode !== 'plain' || !modulePaths.length) return [];
	return collectSsrStyleAssets(server, modulePaths, {
		includeGlobalStyles: true,
		globalStyleModules: options.globalStyleModules,
	});
}

async function renderStoryMarkup(
	server: ViteDevServer,
	storyModule: string | undefined,
	storyExport: string | undefined,
	args: Record<string, unknown>,
	mode: 'hydrate' | 'plain',
): Promise<string> {
	if (!storyModule) {
		throw new Error('JSX-only SSR requires a stamped CSF story module.');
	}

	const mod = (await server.ssrLoadModule(normalizeSsrModulePath(storyModule))) as Record<string, unknown>;
	return renderToString(composeStoryRender(mod, storyExport, args)(), { mode });
}
