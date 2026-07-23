import { installRadiantHydrator, uninstallRadiantHydrator } from '@ecopages/radiant/client/hydrator';
import type { RenderContext } from 'storybook/internal/types';
import { simulatePageLoad } from 'storybook/preview-api';
import { dedent } from 'ts-dedent';
import { ensureSsrMountRoot, teardownCanvas } from './canvas';
import { RADIANT_SSR_ENDPOINT, type RadiantSsrRequestBody, type RadiantSsrResponseBody } from './constants';
import { isEmptyHostShell, storyIdToExportName } from './ssr-markup';
import { toStylesheetLinkHref } from './collect-ssr-styles';
import { linkRadiantViewElement, resolveSsrTarget, type RadiantViewComponent } from './resolve-ssr';
import { sanitizeSsrArgs } from './sanitize-ssr-args';
import { RADIANT_VIEW_ELEMENT } from './symbols';
import type { RadiantRenderer, RadiantStoryParameters } from './types';

type RenderContextWithCallbacks = RenderContext<RadiantRenderer> & {
	showStoryDuringRender?: () => void;
};

function showStoryDuringRender(context: RenderContext<RadiantRenderer>): void {
	(context as RenderContextWithCallbacks).showStoryDuringRender?.();
}

async function fetchSsrPayload(body: RadiantSsrRequestBody): Promise<RadiantSsrResponseBody> {
	const response = await fetch(RADIANT_SSR_ENDPOINT, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});

	let payload: RadiantSsrResponseBody;
	try {
		payload = (await response.json()) as RadiantSsrResponseBody;
	} catch {
		throw new Error(`Radiant SSR returned a non-JSON response (${response.status})`);
	}

	if (!response.ok || payload.error) {
		throw new Error(payload.error ?? `Radiant SSR request failed (${response.status})`);
	}
	return payload;
}

/** Remove module scripts from SSR markup — hydration loads the client module explicitly. */
function stripModuleScripts(markup: string): string {
	return markup.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<script\b[^>]*\/>/gi, '');
}

async function loadSsrStyles(assets: RadiantSsrResponseBody['assets']): Promise<void> {
	for (const asset of assets) {
		if (asset.kind === 'style' && asset.href) {
			const href = toStylesheetLinkHref(asset.href);
			const existing = document.querySelector(`link[data-radiant-ssr-style="${href}"]`);
			if (!existing) {
				const link = document.createElement('link');
				link.rel = 'stylesheet';
				link.href = href;
				link.dataset.radiantSsrStyle = href;
				if (asset.media) {
					link.media = asset.media;
				}
				document.head.appendChild(link);
			}
		}
	}
}

function buildStaticSrcdoc(markup: string, assets: RadiantSsrResponseBody['assets']): string {
	const origin = typeof window !== 'undefined' ? window.location.origin.replace(/"/g, '&quot;') : '';
	const styleAssets = assets.filter((asset) => asset.kind === 'style' && asset.href);
	const styles = styleAssets
		.map((asset) => {
			const path = toStylesheetLinkHref(asset.href!);
			const href = `${origin}${path.startsWith('/') ? path : `/${path}`}`
				.replace(/&/g, '&amp;')
				.replace(/"/g, '&quot;');
			const media = asset.media ? ` media="${asset.media.replace(/"/g, '&quot;')}"` : '';
			return `<link rel="stylesheet" href="${href}"${media} />`;
		})
		.join('');
	const body = stripModuleScripts(markup);
	return `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>${body}</body></html>`;
}

function mountStaticMarkup(canvasElement: HTMLElement, markup: string, assets: RadiantSsrResponseBody['assets']): void {
	const frame = document.createElement('iframe');
	frame.title = 'SSR static preview';
	frame.className = 'radiant-ssr-static-frame';
	frame.setAttribute('sandbox', 'allow-same-origin');
	frame.srcdoc = buildStaticSrcdoc(markup, assets);
	frame.style.cssText = 'display:block;width:100%;min-height:320px;border:0;background:transparent';
	canvasElement.replaceChildren(frame);
}

function syncViewMetadata(component: unknown): void {
	if (typeof component !== 'function') {
		return;
	}
	const view = component as RadiantViewComponent;
	const linked = view[RADIANT_VIEW_ELEMENT];
	if (linked) {
		linkRadiantViewElement(view, linked);
	}
}

/**
 * Server-render via `/__radiant_ssr`, inject markup, optionally load the client module to hydrate.
 */
export async function mountSsrResult(
	context: RenderContext<RadiantRenderer>,
	canvasElement: HTMLElement,
	mode: 'ssr-hydrate' | 'ssr-static',
): Promise<void> {
	context.showMain();

	const radiant = (context.storyContext.parameters as RadiantStoryParameters).radiant;
	const component = context.storyContext.component;
	syncViewMetadata(component);

	const storyModule = radiant?.storyModule;
	const storyExport = radiant?.storyExport ?? storyIdToExportName(context.storyContext.id);

	const ssrTarget = resolveSsrTarget({
		component,
		radiant,
		storyModule,
		storyExport,
	});

	if (!ssrTarget) {
		context.showError({
			title: `Cannot SSR story "${context.name}"`,
			description: dedent`
        Set \`meta.component\` to a RadiantElement constructor, a view created with
        \`defineRadiantView(element, render)\`, or a registered custom-element tag string
        (with the \`.script\` module imported in the story file).

        For multi-export script modules, set \`parameters.radiant.ssrExport\`.
        For edge cases, set \`parameters.radiant.ssrModule\` explicitly.
      `,
		});
		return;
	}

	let payload: RadiantSsrResponseBody;
	try {
		payload = await fetchSsrPayload({
			ssrModule: ssrTarget.ssrModule,
			ssrExport: ssrTarget.ssrExport,
			viewModule: ssrTarget.viewModule,
			viewExport: ssrTarget.viewExport,
			storyModule: ssrTarget.storyModule,
			storyExport: ssrTarget.storyExport,
			args: sanitizeSsrArgs(context.storyContext.args as Record<string, unknown>),
			mode: mode === 'ssr-hydrate' ? 'hydrate' : 'plain',
		});
	} catch (error) {
		context.showError({
			title: `Radiant SSR failed for "${context.name}"`,
			description: error instanceof Error ? error.message : String(error),
		});
		return;
	}

	if (!payload.markup?.trim()) {
		context.showError({
			title: `Radiant SSR returned empty markup for "${context.name}"`,
			description: `Module: ${ssrTarget.ssrModule}`,
		});
		return;
	}

	if (isEmptyHostShell(payload.markup, payload.tagName)) {
		context.showError({
			title: `Radiant SSR produced an empty host shell for "${context.name}"`,
			description: dedent`
        The SSR bridge could not render authored light-DOM content for this story.
        Use a component with a \`render()\` implementation, a \`defineRadiantView\` export
        stamped with a view module path, or set \`parameters.radiant.authoredContent\`.
      `,
		});
		return;
	}

	teardownCanvas(canvasElement);

	if (mode === 'ssr-static') {
		uninstallRadiantHydrator();
		mountStaticMarkup(canvasElement, payload.markup, payload.assets);
		showStoryDuringRender(context);
		return;
	}

	installRadiantHydrator();
	await loadSsrStyles(payload.assets);

	const moduleSrc = radiant?.clientModule ?? payload.clientModuleSrc;
	if (moduleSrc) {
		try {
			await import(/* @vite-ignore */ moduleSrc);
		} catch (error) {
			context.showError({
				title: `Radiant hydration module failed for "${context.name}"`,
				description: error instanceof Error ? error.message : String(error),
			});
			return;
		}
	}

	const mountRoot = ensureSsrMountRoot(canvasElement);
	mountRoot.innerHTML = stripModuleScripts(payload.markup);
	simulatePageLoad(canvasElement);
	showStoryDuringRender(context);
}
