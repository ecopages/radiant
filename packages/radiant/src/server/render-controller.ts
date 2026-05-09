import { renderToString as renderJsxToString, type RenderToStringOptions } from '@ecopages/jsx/server';
import { getControllerIdentifier } from '../core/controller-metadata';
import type { RadiantController } from '../core/radiant-controller';
import { CONTROLLER_ATTRIBUTE } from '../controller-registry';
import { ensureLightDomShim } from './light-dom-shim';
import {
	mergeRenderedComponentAssets,
	normalizeRenderOptions,
	resolvePrimaryClientModuleSrc,
	toRenderedComponentPayload,
	type RenderedComponent,
	type RenderedComponentAsset,
	type RenderedComponentPayload,
	type RenderedComponentWithPreview,
} from './render-component';
import { ensureRadiantElementSsrRuntimeRegistered } from './radiant-component-ssr-runtime';

/** Constructor shape for a server-renderable controller. */
export type ServerRenderableControllerConstructor<TController extends RadiantController = RadiantController> = new (
	host: Element,
) => TController;

/** Serializable controller host attribute values accepted by `renderController()`. */
export type RenderedControllerHostAttributeValue = boolean | number | string | null | undefined;

/** JSX-like class value accepted by `renderController({ host })`. */
export type RenderedControllerHostClassValue =
	| bigint
	| boolean
	| number
	| string
	| null
	| undefined
	| readonly RenderedControllerHostClassValue[]
	| Record<string, unknown>;

/** Declarative controller host attributes accepted by `renderController()`. */
export type RenderedControllerHostAttributes = Record<string, RenderedControllerHostAttributeValue>;

/** JSX-like host options accepted by `renderController()`. */
export type RenderedControllerHostOptions = {
	aria?: Record<string, RenderedControllerHostAttributeValue>;
	class?: RenderedControllerHostClassValue;
	classes?: RenderedControllerHostClassValue;
	data?: Record<string, RenderedControllerHostAttributeValue>;
};

/**
 * Resolves the browser-importable client module URL for a controller constructor.
 */
export type ResolveRenderedControllerClientModule<TController extends RadiantController> = (
	controller: ServerRenderableControllerConstructor<TController>,
) => string | undefined | Promise<string | undefined>;

/**
 * Resolves fragment assets for a controller constructor.
 */
export type ResolveRenderedControllerAssets<TController extends RadiantController> = (
	controller: ServerRenderableControllerConstructor<TController>,
) => readonly RenderedComponentAsset[] | undefined | Promise<readonly RenderedComponentAsset[] | undefined>;

/** Call-site options used by the controller SSR helpers. */
export type RenderControllerCallOptions<TController extends RadiantController> = {
	/** Asset dependencies required by the rendered fragment. */
	assets?: readonly RenderedComponentAsset[];
	/** Low-level flat host attributes serialized onto the rendered controller host. */
	attributes?: RenderedControllerHostAttributes;
	/** JSX-like host config with `data` and `aria` object expansion. */
	host?: RenderedControllerHostOptions;
	/** Browser-importable client module URL used to register the controller before hydration. */
	clientModuleSrc?: string;
	/** Initializes the controller instance before render. */
	initialize?: (controller: TController) => void;
	/** Clock override used by tests and adapters that need deterministic timestamps. */
	now?: () => Date;
	/** JSX server-renderer options forwarded to the controller view render. */
	renderOptions?: RenderToStringOptions;
	/** Lazy asset resolver used when `assets` are not provided directly. */
	resolveAssets?: ResolveRenderedControllerAssets<TController>;
	/** Lazy client-module resolver used when `clientModuleSrc` is not provided directly. */
	resolveClientModuleSrc?: ResolveRenderedControllerClientModule<TController>;
	/** Explicit host tag emitted at the fragment root. */
	tagName: string;
};

/** Serializes a controller host into HTML using an explicit host tag and attributes. */
export async function renderControllerToString<TController extends RadiantController>(
	controller: ServerRenderableControllerConstructor<TController>,
	options: RenderControllerCallOptions<TController>,
): Promise<string> {
	return (await renderResolvedController(controller, options)).markup;
}

/** Renders a controller host into the canonical portable server-rendered shape. */
export async function renderController<TController extends RadiantController>(
	controller: ServerRenderableControllerConstructor<TController>,
	options: RenderControllerCallOptions<TController>,
): Promise<RenderedComponent> {
	return renderResolvedController(controller, options);
}

/** Serializes a controller host into a fragment payload that frameworks can attach to any response shape. */
export async function renderControllerToPayload<TController extends RadiantController>(
	controller: ServerRenderableControllerConstructor<TController>,
	options: RenderControllerCallOptions<TController>,
): Promise<RenderedComponentPayload> {
	return toRenderedComponentPayload(await renderResolvedController(controller, options));
}

/** Renders a controller host into payload fields plus a JSX-compatible preview value. */
export async function renderControllerWithPreview<TController extends RadiantController>(
	controller: ServerRenderableControllerConstructor<TController>,
	options: RenderControllerCallOptions<TController>,
): Promise<RenderedComponentWithPreview> {
	return toRenderedComponentWithPreview(await renderResolvedController(controller, options));
}

async function renderResolvedController<TController extends RadiantController>(
	Controller: ServerRenderableControllerConstructor<TController>,
	options: RenderControllerCallOptions<TController>,
): Promise<RenderedComponent> {
	ensureRadiantElementSsrRuntimeRegistered();

	const tagName = normalizeRenderedControllerTagName(options.tagName);
	const host = createRenderedControllerHost(tagName, normalizeRenderedControllerHostAttributes(Controller, options));
	const controller = new Controller(host);

	try {
		options.initialize?.(controller);
		controller.connectForSsrRender();

		const resolvedClientModuleSrc = options.clientModuleSrc ?? (await options.resolveClientModuleSrc?.(Controller));
		const resolvedAssets = options.assets ?? (await options.resolveAssets?.(Controller)) ?? [];
		const assets = mergeRenderedComponentAssets(resolvedAssets, resolvedClientModuleSrc);
		const clientModuleSrc = resolvePrimaryClientModuleSrc(assets) ?? resolvedClientModuleSrc;
		const generatedAt = (options.now ?? createDefaultRenderTimestamp)().toISOString();
		const renderOptions = normalizeRenderOptions(options.renderOptions);
		const markup = renderRenderedControllerHost(controller, tagName, renderOptions);

		return {
			markup,
			metadata: {
				assets,
				clientModuleUrl: clientModuleSrc,
				generatedAt,
				tagName,
			},
			preview: { nodeType: 1, outerHTML: markup },
		};
	} finally {
		controller.disconnectForSsrRender();
	}
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

function normalizeRenderedControllerTagName(tagName: string): string {
	const normalizedTagName = tagName.trim().toLowerCase();

	if (!normalizedTagName) {
		throw new Error('Controller SSR host tagName is required.');
	}

	return normalizedTagName;
}

function createRenderedControllerHost(tagName: string, attributes: RenderedControllerHostAttributes): Element {
	const windowLike = ensureLightDomShim();
	const host = windowLike.document.createElement(tagName);

	for (const [name, value] of Object.entries(attributes)) {
		if (value === undefined || value === null || value === false) {
			continue;
		}

		host.setAttribute(name, value === true ? '' : String(value));
	}

	return host;
}

function normalizeRenderedControllerHostAttributes<TController extends RadiantController>(
	Controller: ServerRenderableControllerConstructor<TController>,
	options: RenderControllerCallOptions<TController>,
): RenderedControllerHostAttributes {
	const normalizedAttributes: RenderedControllerHostAttributes = {};
	const host = options.host;

	const mergedClassValue = normalizeRenderedControllerClassValue(
		options.attributes?.class,
		host?.class,
		host?.classes,
	);

	if (mergedClassValue !== undefined) {
		normalizedAttributes.class = mergedClassValue;
	}

	appendRenderedControllerStructuredAttributes(normalizedAttributes, 'data', host?.data);
	appendRenderedControllerStructuredAttributes(normalizedAttributes, 'aria', host?.aria);
	appendRenderedControllerFlatAttributes(normalizedAttributes, options.attributes);

	const controllerIdentifier = getControllerIdentifier(Controller as unknown as CustomElementConstructor);

	if (controllerIdentifier && normalizedAttributes[CONTROLLER_ATTRIBUTE] == null) {
		normalizedAttributes[CONTROLLER_ATTRIBUTE] = controllerIdentifier;
	}

	return normalizedAttributes;
}

function appendRenderedControllerStructuredAttributes(
	attributes: RenderedControllerHostAttributes,
	prefix: 'aria' | 'data',
	value: Record<string, RenderedControllerHostAttributeValue> | undefined,
): void {
	if (!isPlainRenderedControllerAttributeObject(value)) {
		return;
	}

	for (const [name, entryValue] of Object.entries(value)) {
		attributes[`${prefix}-${toKebabCaseRenderedControllerAttribute(name)}`] = entryValue;
	}
}

function appendRenderedControllerFlatAttributes(
	attributes: RenderedControllerHostAttributes,
	value: RenderedControllerHostAttributes | undefined,
): void {
	if (!value) {
		return;
	}

	for (const [name, entryValue] of Object.entries(value)) {
		attributes[name] = entryValue;
	}
}

function normalizeRenderedControllerClassValue(...values: unknown[]): string | undefined {
	const tokens: string[] = [];

	for (const value of values) {
		appendRenderedControllerClassTokens(tokens, value);
	}

	return tokens.length === 0 ? undefined : tokens.join(' ');
}

function appendRenderedControllerClassTokens(tokens: string[], value: unknown): void {
	if (value === undefined || value === null || value === false || value === true) {
		return;
	}

	if (typeof value === 'string') {
		if (value !== '') {
			tokens.push(value);
		}
		return;
	}

	if (typeof value === 'number' || typeof value === 'bigint') {
		tokens.push(String(value));
		return;
	}

	if (Array.isArray(value)) {
		for (const entry of value) {
			appendRenderedControllerClassTokens(tokens, entry);
		}
		return;
	}

	if (!isPlainRenderedControllerAttributeObject(value)) {
		return;
	}

	for (const [name, enabled] of Object.entries(value)) {
		if (enabled) {
			tokens.push(name);
		}
	}
}

function isPlainRenderedControllerAttributeObject(value: unknown): value is Record<string, unknown> {
	return Object.prototype.toString.call(value) === '[object Object]';
}

function toKebabCaseRenderedControllerAttribute(value: string): string {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/[_\s]+/g, '-')
		.toLowerCase();
}

function renderRenderedControllerHost(
	controller: RadiantController,
	tagName: string,
	options: RenderToStringOptions,
): string {
	return `<${tagName}${serializeRenderedControllerHostAttributes(controller.host)}>${renderJsxToString(controller.render(), options)}</${tagName}>`;
}

function serializeRenderedControllerHostAttributes(host: Element): string {
	return host
		.getAttributeNames()
		.map((attributeName) => serializeRenderedControllerAttribute(attributeName, host.getAttribute(attributeName)))
		.join('');
}

function serializeRenderedControllerAttribute(name: string, value: string | null): string {
	if (value === '') {
		return ` ${name}`;
	}

	return ` ${name}="${escapeRenderedControllerAttributeValue(value ?? '')}"`;
}

function escapeRenderedControllerAttributeValue(value: string): string {
	return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
