function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
	return typeof value === 'object' && value !== null;
}

function isDomElement(value: unknown): value is Element {
	if (value instanceof Element) {
		return true;
	}

	return isRecord(value) && (value as { nodeType?: number }).nodeType === 1;
}

function hasOwnElementHost(value: Record<PropertyKey, unknown>): value is { host: Element } {
	return Object.prototype.hasOwnProperty.call(value, 'host') && isDomElement(value.host);
}

function hasOwnElementAlias(value: Record<PropertyKey, unknown>): value is { element: Element } {
	return Object.prototype.hasOwnProperty.call(value, 'element') && isDomElement(value.element);
}

/** Whether `target` is a controller-style wrapper with an own `host` or `element` property. */
export function isControllerHost(target: unknown): boolean {
	if (!isRecord(target)) {
		return false;
	}

	return hasOwnElementHost(target) || hasOwnElementAlias(target);
}

/**
 * Resolves a Radiant element host or controller wrapper to its underlying `Element`.
 *
 * @remarks Rejects null/primitives and ignores inherited `host`/`element` properties.
 */
export function resolveHostElement(target: unknown): Element {
	if (isDomElement(target)) {
		return target;
	}

	if (!isRecord(target)) {
		throw new TypeError('Radiant host target must be an Element or controller host wrapper.');
	}

	if (hasOwnElementHost(target)) {
		return target.host;
	}

	if (hasOwnElementAlias(target)) {
		return target.element;
	}

	throw new TypeError('Radiant host target must be an Element or controller host wrapper.');
}

/** Like {@link resolveHostElement}, but returns `null` when no element can be resolved. */
export function resolveHostElementOrNull(target: unknown): Element | null {
	if (isDomElement(target)) {
		return target;
	}

	if (!isRecord(target)) {
		return null;
	}

	if (hasOwnElementHost(target)) {
		return target.host;
	}

	if (hasOwnElementAlias(target)) {
		return target.element;
	}

	return null;
}
