import { escapeScriptJson } from '../tools/escape-script-json';

/** Attribute marker used to identify hydration payloads inside a host. */
export const HYDRATION_ATTRIBUTE = 'data-hydration';
/** Discriminator that scopes a hydration payload to a specific feature. */
export const HYDRATION_TYPE_ATTRIBUTE = 'data-hydration-type';
/** Optional key that scopes a hydration payload to a specific decorated field. */
export const HYDRATION_KEY_ATTRIBUTE = 'data-hydration-key';

export type HydrationPayloadType = 'signal' | 'context';

/** Creates a `<script type="application/json">` tag for a hydration payload. */
export function createHydrationScriptTag(options: {
	type: HydrationPayloadType;
	hydrationKey?: string;
	serializedValue: string;
}): string {
	const keyAttribute = options.hydrationKey
		? ` ${HYDRATION_KEY_ATTRIBUTE}="${escapeHtmlAttribute(options.hydrationKey)}"`
		: '';

	return `<script type="application/json" ${HYDRATION_ATTRIBUTE} ${HYDRATION_TYPE_ATTRIBUTE}="${options.type}"${keyAttribute}>${options.serializedValue}</script>`;
}

/** Escapes serialized JSON so it remains safe inside an HTML script tag. */
export function escapeHydrationJson(value: string): string {
	return escapeScriptJson(value);
}

/** Parses JSON from a hydration script element, returning the fallback on failure. */
export function parseHydrationPayload<T>(element: Element, fallback: T): T {
	const textContent = element.textContent;

	if (!textContent) {
		return fallback;
	}

	try {
		return JSON.parse(textContent) as T;
	} catch {
		if (typeof console !== 'undefined') {
			console.warn(
				`[@ecopages/radiant] Failed to parse hydration payload from <script ${HYDRATION_ATTRIBUTE}>:`,
				textContent.slice(0, 120),
			);
		}
		return fallback;
	}
}

/**
 * Finds a hydration script element inside a host by type and optional key.
 *
 * When a key is provided, looks for an exact `data-hydration-key` match.
 * Otherwise, returns the first unkeyed script matching the type.
 */
export function findHydrationScript(
	host: Element,
	type: HydrationPayloadType,
	hydrationKey?: string,
): Element | null {
	const children = host.children;

	if (!children || children.length === 0) {
		const childNodes = (host as Partial<{ childNodes: ArrayLike<{ nodeType: number }> }>).childNodes;

		if (!childNodes || childNodes.length === 0) {
			return null;
		}

		for (let i = 0; i < childNodes.length; i += 1) {
			const node = childNodes[i]!;

			if (node.nodeType !== 1) {
				continue;
			}

			const element = node as unknown as Element;

			if (matchesHydrationScript(element, type, hydrationKey)) {
				return element;
			}
		}

		return null;
	}

	for (let i = 0; i < children.length; i += 1) {
		if (matchesHydrationScript(children[i]!, type, hydrationKey)) {
			return children[i]!;
		}
	}

	return null;
}

function matchesHydrationScript(element: Element, type: HydrationPayloadType, hydrationKey?: string): boolean {
	if (
		element.tagName !== 'SCRIPT' ||
		!element.hasAttribute(HYDRATION_ATTRIBUTE) ||
		element.getAttribute(HYDRATION_TYPE_ATTRIBUTE) !== type
	) {
		return false;
	}

	if (hydrationKey !== undefined) {
		return element.getAttribute(HYDRATION_KEY_ATTRIBUTE) === hydrationKey;
	}

	return !element.hasAttribute(HYDRATION_KEY_ATTRIBUTE);
}

function escapeHtmlAttribute(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
