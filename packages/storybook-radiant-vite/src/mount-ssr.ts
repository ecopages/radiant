import { installRadiantHydrator, uninstallRadiantHydrator } from '@ecopages/radiant/client/hydrator';
import { hydrate } from '@ecopages/jsx';
import type { RenderContext } from 'storybook/internal/types';
import { simulatePageLoad } from 'storybook/preview-api';
import { dedent } from 'ts-dedent';
import { ensureSsrMountRoot, teardownCanvas } from './canvas';
import { composeStoryRender } from './compose-story-render';
import { RADIANT_SSR_ENDPOINT, type RadiantSsrRequestBody, type RadiantSsrResponseBody } from './constants';
import { isEmptyHostShell, storyIdToExportName } from './ssr-markup';
import { toStylesheetLinkHref } from './collect-ssr-styles';
import { resolveSsrTarget, syncViewMetadata } from './resolve-ssr';
import { sanitizeSsrArgs } from './sanitize-ssr-args';
import type { RadiantRenderer, RadiantStoryParameters } from './types';

type RenderContextWithCallbacks = RenderContext<RadiantRenderer> & {
	showStoryDuringRender?: () => void;
};

function showStoryDuringRender(context: RenderContext<RadiantRenderer>): void {
	(context as RenderContextWithCallbacks).showStoryDuringRender?.();
}

function hydrateStoryJsx(
	storyModule: Record<string, unknown>,
	storyExport: string | undefined,
	args: Record<string, unknown>,
	mountRoot: HTMLElement,
): void {
	hydrate(composeStoryRender(storyModule, storyExport, args)(), mountRoot);
}

export function mountSsrErrorBanner(canvasElement: HTMLElement, title: string, description: string): void {
	teardownCanvas(canvasElement);
	const banner = document.createElement('section');
	banner.className = 'radiant-ssr-error';
	banner.setAttribute('role', 'alert');
	const heading = document.createElement('strong');
	heading.textContent = title;
	const details = document.createElement('pre');
	details.textContent = description;
	banner.append(heading, details);
	canvasElement.appendChild(banner);
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
	return markup
		.replace(/<script\b(?=[^>]*\btype\s*=\s*["']module["'])[^>]*>[\s\S]*?<\/script>/gi, '')
		.replace(/<script\b(?=[^>]*\btype\s*=\s*["']module["'])[^>]*\/>/gi, '');
}

export function clearSsrInjectedStyles(): void {
	document.querySelectorAll('link[data-radiant-ssr-style]').forEach((node) => node.remove());
}

async function loadSsrStyles(assets: RadiantSsrResponseBody['assets']): Promise<void> {
	clearSsrInjectedStyles();
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
	syncViewMetadata(component, radiant?.element);

	const storyModule = radiant?.storyModule;
	const storyExport = radiant?.storyExport ?? storyIdToExportName(context.storyContext.id);

	const ssrTarget = resolveSsrTarget({
		component,
		radiant,
		storyModule,
		storyExport,
	});

	if (!ssrTarget) {
		mountSsrErrorBanner(
			canvasElement,
			`Cannot SSR story "${context.name}"`,
			dedent`
        Set \`meta.component\` to a RadiantElement constructor, a view linked via
        \`parameters.radiant.element\`, or a registered custom-element tag string
        (with the \`.script\` module imported in the story file).

        For multi-export script modules, set \`parameters.radiant.ssrExport\`.
        For edge cases, set \`parameters.radiant.ssrModule\` explicitly.
			`,
		);
		return;
	}

	let payload: RadiantSsrResponseBody;
	try {
		payload = await fetchSsrPayload({
			kind: ssrTarget.kind,
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
		mountSsrErrorBanner(
			canvasElement,
			`Radiant SSR failed for "${context.name}"`,
			error instanceof Error ? error.message : String(error),
		);
		return;
	}

	if (!payload.markup?.trim()) {
		mountSsrErrorBanner(
			canvasElement,
			`Radiant SSR returned empty markup for "${context.name}"`,
			`Module: ${ssrTarget.ssrModule ?? ssrTarget.storyModule}`,
		);
		return;
	}

	if (payload.tagName && isEmptyHostShell(payload.markup, payload.tagName)) {
		mountSsrErrorBanner(
			canvasElement,
			`Radiant SSR produced an empty host shell for "${context.name}"`,
			dedent`
        The SSR bridge could not render authored light-DOM content for this story.
        Use a component with a \`render()\` implementation, a view export stamped with a
        view module path, or set \`parameters.radiant.authoredContent\`.
			`,
		);
		return;
	}

	teardownCanvas(canvasElement);

	if (mode === 'ssr-static') {
		uninstallRadiantHydrator();
		mountStaticMarkup(canvasElement, payload.markup, payload.assets);
		showStoryDuringRender(context);
		return;
	}

	await loadSsrStyles(payload.assets);

	const moduleSrc = radiant?.clientModule ?? payload.clientModuleSrc;
	let clientModule: Record<string, unknown> | undefined;
	if (moduleSrc) {
		try {
			clientModule = (await import(/* @vite-ignore */ moduleSrc)) as Record<string, unknown>;
		} catch (error) {
			mountSsrErrorBanner(
				canvasElement,
				`Radiant hydration module failed for "${context.name}"`,
				error instanceof Error ? error.message : String(error),
			);
			return;
		}
	}

	const mountRoot = ensureSsrMountRoot(canvasElement);
	installRadiantHydrator();
	mountRoot.innerHTML = stripModuleScripts(payload.markup);
	if (ssrTarget.kind === 'jsx') {
		try {
			const storyModule =
				ssrTarget.storyModule === moduleSrc
					? clientModule
					: ((await import(/* @vite-ignore */ ssrTarget.storyModule!)) as Record<string, unknown>);
			hydrateStoryJsx(
				storyModule!,
				ssrTarget.storyExport,
				context.storyContext.args as Record<string, unknown>,
				mountRoot,
			);
		} catch (error) {
			mountSsrErrorBanner(
				canvasElement,
				`Radiant JSX hydration failed for "${context.name}"`,
				error instanceof Error ? error.message : String(error),
			);
			return;
		}
	}
	simulatePageLoad(canvasElement);
	showStoryDuringRender(context);
}
