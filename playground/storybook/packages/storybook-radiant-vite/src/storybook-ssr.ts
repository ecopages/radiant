import '@ecopages/radiant/server/install-ssr-runtime';
import type { ViteDevServer } from 'vite';
import { renderToString } from '@ecopages/jsx/server';
import type { RenderedComponent } from '@ecopages/radiant/server/render-component';
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

function applyControlOverrides(
	base: Record<string, unknown>,
	overrides: Record<string, unknown>,
): Record<string, unknown> {
	const merged = { ...base };

	for (const [key, value] of Object.entries(overrides)) {
		if (value === undefined) {
			continue;
		}

		if (key === 'items' && Array.isArray(value) && Array.isArray(merged.items)) {
			merged.items = (merged.items as unknown[]).map((baseItem, index) => {
				const overrideItem = value[index];
				if (!overrideItem || typeof overrideItem !== 'object' || typeof baseItem !== 'object') {
					return baseItem;
				}

				return { ...(baseItem as Record<string, unknown>), ...(overrideItem as Record<string, unknown>) };
			});
			continue;
		}

		merged[key] = value;
	}

	return merged;
}

export async function renderViewAuthoredContent(
	server: ViteDevServer,
	viewModule: string,
	viewExport: string | undefined,
	args: Record<string, unknown>,
	mode: 'hydrate' | 'plain',
): Promise<string | undefined> {
	const mod = (await server.ssrLoadModule(normalizeSsrModulePath(viewModule))) as Record<string, unknown>;
	const view = viewExport ? mod[viewExport] : mod.default;

	if (typeof view !== 'function') {
		throw new Error(`View export "${viewExport ?? 'default'}" was not found in ${viewModule}`);
	}

	const rendered = await renderToString(view(args), { mode });
	const linkedElement = (view as { [key: symbol]: CustomElementConstructor | undefined })[
		Symbol.for('@ecopages/storybook-radiant.viewElement')
	];
	const tagName = linkedElement ? getCustomElementTagName(linkedElement) : undefined;

	if (!tagName) {
		return rendered;
	}

	return extractHostInnerHtml(rendered, tagName);
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
	assets: RenderedComponent['metadata']['assets'];
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
	const args = await resolveStoryArgs(server, body.storyModule, body.storyExport, body.args ?? {});
	const mode = body.mode ?? 'hydrate';

	let authoredContent: string | undefined;
	if (body.viewModule) {
		authoredContent = await renderViewAuthoredContent(server, body.viewModule, body.viewExport, args, mode);
		if (!authoredContent?.trim()) {
			const itemCount = Array.isArray(args.items) ? args.items.length : 0;
			throw new Error(
				`View SSR produced empty authored content for ${body.viewModule} (items=${itemCount}, args=${Object.keys(args).join(',')})`,
			);
		}
	}

	const rendered = await renderSsrComponent(Component, {
		authoredContent,
		clientModuleSrc: body.viewModule ?? ssrModule,
		renderOptions: { mode },
		initialize: (instance) => {
			applyStoryArgs(instance as object, args);
		},
	});

	const styleAssets =
		mode === 'plain'
			? await collectSsrStyleAssets(
					server,
					[ssrModule, body.viewModule].filter((entry): entry is string => Boolean(entry)),
					{ includeGlobalStyles: true, globalStyleModules: options.globalStyleModules },
				)
			: [];

	return {
		markup: rendered.markup,
		tagName: rendered.metadata.tagName ?? tagName,
		assets: mergeSsrAssets(rendered.metadata.assets, styleAssets),
		clientModuleSrc: body.viewModule ?? rendered.metadata.clientModuleUrl ?? ssrModule,
		generatedAt: rendered.metadata.generatedAt,
	};
}
