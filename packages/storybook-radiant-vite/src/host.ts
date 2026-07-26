import type { Args } from 'storybook/internal/types';
import { CUSTOM_ELEMENT_TAG_NAME } from './constants';

export function getCustomElementTagName(target: CustomElementConstructor): string | undefined {
	return (target as CustomElementConstructor & { [CUSTOM_ELEMENT_TAG_NAME]?: string })[CUSTOM_ELEMENT_TAG_NAME];
}

export function isCustomElementConstructor(value: unknown): value is CustomElementConstructor {
	if (typeof value !== 'function') {
		return false;
	}
	const ctor = value as CustomElementConstructor;
	if (ctor.prototype instanceof HTMLElement) {
		return true;
	}
	return Boolean(getCustomElementTagName(ctor));
}

/**
 * Prefer an export that carries Radiant `@customElement` tag metadata.
 * Falls back to `default`, then the first class-like export.
 */
export function pickComponentExport(
	moduleExports: Record<string, unknown>,
	ssrExport?: string,
): CustomElementConstructor {
	if (ssrExport) {
		const named = moduleExports[ssrExport];
		if (typeof named !== 'function') {
			throw new Error(`SSR export "${ssrExport}" was not found or is not a constructor`);
		}
		if (!isCustomElementConstructor(named)) {
			throw new Error(
				`SSR export "${ssrExport}" is not a RadiantElement constructor. ` +
					`Check that parameters.radiant.ssrModule points at the .script module, not the view module.`,
			);
		}
		return named as CustomElementConstructor;
	}

	const candidates = Object.entries(moduleExports).filter(
		([key, value]) => key !== 'module.exports' && typeof value === 'function',
	);

	const withTag = candidates.find(([, value]) => Boolean(getCustomElementTagName(value as CustomElementConstructor)));
	if (withTag) {
		return withTag[1] as CustomElementConstructor;
	}

	if (typeof moduleExports.default === 'function') {
		return moduleExports.default as CustomElementConstructor;
	}

	for (const [, value] of candidates) {
		const proto = (value as Function).prototype;
		if (proto && Object.getPrototypeOf(proto) !== Object.prototype) {
			return value as CustomElementConstructor;
		}
	}

	throw new Error('No RadiantElement constructor export found in SSR module');
}

/**
 * Apply CSF args onto a host.
 * - Always assigns properties (Radiant `@prop` / `@state` surface).
 * - When `target` is an `HTMLElement`, also reflects primitives as attributes.
 */
export function applyStoryArgs(target: object, args: Args): void {
	const element = target instanceof HTMLElement ? target : null;

	for (const [key, value] of Object.entries(args)) {
		if (key === 'children' || value === undefined) {
			continue;
		}

		if (element && (key === 'className' || key === 'class')) {
			element.className = String(value);
			continue;
		}

		if (element && typeof value === 'boolean') {
			if (value) {
				element.setAttribute(key, '');
			} else {
				element.removeAttribute(key);
			}
		} else if (element && (typeof value === 'string' || typeof value === 'number')) {
			element.setAttribute(key, String(value));
		}

		try {
			(target as Record<string, unknown>)[key] = value;
		} catch {
			// ignore read-only accessors
		}
	}
}
