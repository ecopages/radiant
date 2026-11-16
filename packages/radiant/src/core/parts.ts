import { RADIANT_ELEMENT_BRAND } from './radiant-element-brand';

const attachedControllerRoots = new WeakMap<Element, Set<object>>();

/**
 * Marks `root` as a scope root while `controller` is attached to it. Called by `RadiantController.connect()`.
 *
 * @remarks
 * Keyed by controller so a repeated `connect()` is idempotent and a root shared by several controllers
 * stays a scope root until the last one detaches.
 */
export function markControllerRoot(root: Element, controller: object): void {
	const controllers = attachedControllerRoots.get(root);

	if (controllers) {
		controllers.add(controller);
		return;
	}

	attachedControllerRoots.set(root, new Set([controller]));
}

/** Undoes {@link markControllerRoot}. Called by `RadiantController.disconnect()`. */
export function unmarkControllerRoot(root: Element, controller: object): void {
	const controllers = attachedControllerRoots.get(root);

	if (!controllers) {
		return;
	}

	controllers.delete(controller);

	if (controllers.size === 0) {
		attachedControllerRoots.delete(root);
	}
}

/**
 * Builds the selector for a part name, with `\` and `"` escaped inside the quoted attribute value.
 *
 * @remarks
 * Not `CSS.escape`: that escapes identifiers, and its `\31 ` form for a leading digit is not decoded by the
 * server DOM shim's attribute matching, so a name such as `1abc` would match in the browser only.
 */
export function partSelector(name: string): string {
	return `[data-ref="${name.replace(/["\\]/g, '\\$&')}"]`;
}

function startsScope(element: Element): boolean {
	return RADIANT_ELEMENT_BRAND in element || attachedControllerRoots.has(element);
}

/**
 * Whether `part` belongs to `host`: no upgraded Element Host or attached Controller Host root sits between them.
 *
 * @remarks
 * Read from the current DOM on every call, with no cache. `host` is never its own part. A part that is itself
 * a nested host belongs to the enclosing scope, because the walk starts at its parent.
 */
export function isPartOwnedBy(part: Element, host: Element): boolean {
	for (let ancestor = part.parentElement; ancestor; ancestor = ancestor.parentElement) {
		if (ancestor === host) {
			return true;
		}

		if (startsScope(ancestor)) {
			return false;
		}
	}

	return false;
}

/**
 * First part named `name` that `host` owns, in document order, or `null`.
 *
 * @remarks
 * Checks the first `querySelector` match before scanning every match, so the common case, where that match is
 * owned, skips `querySelectorAll` and the extra ownership walks.
 */
export function resolvePart<T extends Element = Element>(host: Element, name: string): T | null {
	const selector = partSelector(name);
	const first = host.querySelector(selector);

	if (!first || isPartOwnedBy(first, host)) {
		return first as T | null;
	}

	for (const candidate of host.querySelectorAll(selector)) {
		if (isPartOwnedBy(candidate, host)) {
			return candidate as T;
		}
	}

	return null;
}

/** Every part named `name` that `host` owns, in document order. */
export function resolveParts<T extends Element = Element>(host: Element, name: string): T[] {
	const owned: T[] = [];

	for (const candidate of host.querySelectorAll(partSelector(name))) {
		if (isPartOwnedBy(candidate, host)) {
			owned.push(candidate as T);
		}
	}

	return owned;
}
