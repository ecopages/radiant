import '@ecopages/radiant/server/install-light-dom-shim';
import { renderToString, type RenderToStringOptions } from '@ecopages/jsx/server';
import type { RadiantController } from '@ecopages/radiant';

type ServerElementConstructor = new (tagName?: string) => Element;

export function createServerHost(tagName: string): Element {
	const ElementConstructor = globalThis.Element as unknown as ServerElementConstructor;
	return new ElementConstructor(tagName);
}

export function renderControllerHostToString(
	controller: RadiantController,
	options: RenderToStringOptions = { mode: 'hydrate' },
): string {
	return `<${controller.host.tagName.toLowerCase()}${serializeHostAttributes(controller.host)}>${renderToString(controller.render(), options)}</${controller.host.tagName.toLowerCase()}>`;
}

function serializeHostAttributes(host: Element): string {
	return host
		.getAttributeNames()
		.map((attributeName) => serializeAttribute(attributeName, host.getAttribute(attributeName)))
		.join('');
}

function serializeAttribute(name: string, value: string | null): string {
	if (value === '') {
		return ` ${name}`;
	}

	return ` ${name}="${escapeAttributeValue(value ?? '')}"`;
}

function escapeAttributeValue(value: string): string {
	return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
