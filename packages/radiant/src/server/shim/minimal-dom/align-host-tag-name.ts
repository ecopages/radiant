import { getCustomElementTagName } from '../../core/custom-element-metadata';

function isMinimalDomElement(host: object): host is { localName: string; tagName: string } {
	return (
		typeof host === 'object' &&
		host !== null &&
		'localName' in host &&
		typeof (host as { localName?: unknown }).localName === 'string' &&
		'materializeChildren' in host
	);
}

/**
 * Aligns a minimal-DOM host's `localName` / `tagName` with `@customElement` metadata.
 *
 * Radiant SSR instantiates hosts via `new Component()`, which defaults the shim to
 * `div`. Serialized markup already uses metadata tag names; this keeps the live
 * SSR tree consistent for `closest`, `matches`, and `outerHTML`.
 */
export function alignMinimalDomHostTagName(host: object, tagName?: string): void {
	if (!isMinimalDomElement(host)) {
		return;
	}

	const resolvedTagName = tagName ?? getCustomElementTagName(host.constructor as CustomElementConstructor);

	if (!resolvedTagName || host.localName === resolvedTagName) {
		return;
	}

	Object.defineProperty(host, 'localName', {
		value: resolvedTagName,
		enumerable: true,
		configurable: true,
	});
	Object.defineProperty(host, 'tagName', {
		value: resolvedTagName.toUpperCase(),
		enumerable: true,
		configurable: true,
	});
}
