/// <reference path="../client.d.ts" />
import '@ecopages/radiant/server/install-ssr-runtime';
import type { JsxRenderable } from '@ecopages/jsx';
import { RadiantController, resolveRegisteredController } from '@ecopages/radiant';
import type {
	RenderedComponent,
	RenderedComponentAsset,
	ServerRenderableComponent,
	ServerRenderableComponentConstructor,
} from '@ecopages/radiant/server/render-component';
import { renderControllerToString } from '@ecopages/radiant/server/render-controller';
import 'virtual:radiant/components';
import { resolveRadiantAppLoadMode } from 'virtual:radiant/app-load-mode';
import { resolveRadiantDocumentAssets } from 'virtual:radiant/ssr-asset-registry';
import {
	createRadiantDocumentStateScriptMarkup,
	hasRadiantDocumentState,
	type RadiantDocumentState,
	type RadiantDocumentUsage,
} from '../runtime/document-state';
import { discoverRadiantDocumentUsage } from '../lib/discover-document-usage';
import { renderSsrComponent, type RenderSsrComponentOptions } from '../ssr/render';
import { renderToString, type RenderToStringOptions } from '@ecopages/jsx/server';

export type RenderRadiantNitroPageContext = {
	rendered: RenderedComponent;
};

export type RenderedRadiantDocument = {
	assets: readonly RenderedComponentAsset[];
	generatedAt: string;
	html: string;
	state: RadiantDocumentState;
	usage: RadiantDocumentUsage;
};

export type RenderRadiantDocumentOptions = {
	now?: () => Date;
	renderDocument: () => JsxRenderable;
	renderOptions?: RenderToStringOptions;
	resolveAssets?: (
		usage: RadiantDocumentUsage,
	) => readonly RenderedComponentAsset[] | Promise<readonly RenderedComponentAsset[]>;
};

export type RenderRadiantNitroDocumentOptions = RenderRadiantDocumentOptions & {
	headers?: HeadersInit;
	request: Request;
};

export type RenderRadiantNitroPageOptions<TComponent extends ServerRenderableComponent> = {
	request: Request;
	component: ServerRenderableComponentConstructor<TComponent>;
	componentOptions?: RenderSsrComponentOptions<TComponent>;
	renderPage: (context: RenderRadiantNitroPageContext) => JsxRenderable;
	renderOptions?: RenderToStringOptions;
	headers?: HeadersInit;
};

export function isRadiantClientOnlyRequest(request: Request): boolean {
	return resolveRadiantAppLoadMode(request) === 'client-only';
}

export function createRadiantHtmlResponse(html: string, headers?: HeadersInit): Response {
	return new Response(html, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			...Object.fromEntries(new Headers(headers).entries()),
		},
	});
}

export function createRadiantClientOnlyResponse(headers?: HeadersInit): Response {
	return createRadiantHtmlResponse('', headers);
}

export async function renderRadiantDocument({
	now = () => new Date(),
	renderDocument,
	renderOptions = { mode: 'hydrate' },
	resolveAssets = resolveRadiantDocumentAssets,
}: RenderRadiantDocumentOptions): Promise<RenderedRadiantDocument> {
	const html = await expandRadiantDocumentControllers(renderToString(renderDocument(), renderOptions), renderOptions);
	const usage = discoverRadiantDocumentUsage(html);
	const assets = await resolveAssets(usage);
	const generatedAt = now().toISOString();
	const state = {
		assets,
		generatedAt,
		usage,
	} satisfies RadiantDocumentState;

	return {
		assets,
		generatedAt,
		html,
		state,
		usage,
	};
}

export async function renderRadiantNitroDocument({
	headers,
	request,
	...options
}: RenderRadiantNitroDocumentOptions): Promise<Response> {
	if (isRadiantClientOnlyRequest(request)) {
		return createRadiantClientOnlyResponse(headers);
	}

	const rendered = await renderRadiantDocument(options);
	const documentHtml = hasRadiantDocumentState(rendered.state)
		? injectRadiantDocumentStateIntoHtml(rendered.html, createRadiantDocumentStateScriptMarkup(rendered.state))
		: rendered.html;
	return createRadiantHtmlResponse(documentHtml, headers);
}

export async function renderRadiantNitroPage<TComponent extends ServerRenderableComponent>({
	request,
	component,
	componentOptions,
	renderPage,
	renderOptions = { mode: 'hydrate' },
	headers,
}: RenderRadiantNitroPageOptions<TComponent>): Promise<Response> {
	const rendered = await renderSsrComponent(component, componentOptions);

	return renderRadiantNitroDocument({
		headers,
		now: componentOptions?.now,
		request,
		renderDocument: () => renderPage({ rendered }),
		renderOptions,
	});
}

const RADIANT_CONTROLLER_ATTRIBUTE = 'data-controller';
const HTML_ATTRIBUTE_PATTERN = /([:^@A-Za-z0-9_.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+)))?/g;

function parseRadiantDocumentAttributes(rawAttributes: string): Record<string, string> {
	const attributes: Record<string, string> = {};

	for (const match of rawAttributes.matchAll(HTML_ATTRIBUTE_PATTERN)) {
		const [, name, doubleQuoted, singleQuoted, bareValue] = match;

		if (!name) {
			continue;
		}

		attributes[name] = doubleQuoted ?? singleQuoted ?? bareValue ?? '';
	}

	return attributes;
}

function injectRadiantDocumentStateIntoHtml(html: string, scriptMarkup: string): string {
	const rootTagEnd = html.indexOf('>');

	if (rootTagEnd === -1) {
		return `${scriptMarkup}${html}`;
	}

	return `${html.slice(0, rootTagEnd + 1)}${scriptMarkup}${html.slice(rootTagEnd + 1)}`;
}

async function expandRadiantDocumentControllers(html: string, renderOptions: RenderToStringOptions): Promise<string> {
	let expandedHtml = html;

	for (const match of html.matchAll(EMPTY_CONTROLLER_HOST_PATTERN)) {
		const [fullMatch, rawTagName = '', rawAttributes = ''] = match;
		const attributes = parseRadiantDocumentAttributes(rawAttributes);
		const controllerIdentifiers = (attributes[RADIANT_CONTROLLER_ATTRIBUTE] ?? '')
			.split(/\s+/)
			.map((identifier) => identifier.trim())
			.filter((identifier) => identifier.length > 0);

		for (const identifier of controllerIdentifiers) {
			const controller = resolveRegisteredController(identifier);

			if (!controller || controller.prototype.render === RadiantController.prototype.render) {
				continue;
			}

			expandedHtml = expandedHtml.replace(
				fullMatch,
				await renderControllerToString(controller, {
					attributes,
					renderOptions,
					tagName: rawTagName.toLowerCase(),
				}),
			);
			break;
		}
	}

	return expandedHtml;
}

const EMPTY_CONTROLLER_HOST_PATTERN =
	/<([a-z][a-z0-9-]*)([^<>]*\sdata-controller=(?:"[^"]*"|'[^']*'|[^\s"'>/]+)[^<>]*)>\s*<\/\1>/gi;
