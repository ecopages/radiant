import { resolvePart, resolveParts } from '../../core/parts';
import { REACTIVE_HOST, type ReactiveHostInternals } from '../../core/reactive-host';
import { warnOnceInDevelopment } from '../../helpers/dev-warnings';
import type { QueryHostTarget } from '../../helpers/create-query';
import { resolveHostElement } from '../../helpers/resolve-host-element';
import { toKebabCaseAttributeName } from '../../utils/attribute-utils';

export type RefDecoratorHost = QueryHostTarget;

/** Options for `@ref` and `@refAll`. */
export type RefOptions = {
	/**
	 * Warns once in development when no part matches after the host's first connect. Off by default.
	 */
	required?: boolean;
};

export type RefFieldConfig = {
	name?: string;
	all: boolean;
	required: boolean;
};

export function createRefConfig(
	all: boolean,
	nameOrOptions?: string | RefOptions,
	options?: RefOptions,
): RefFieldConfig {
	const name = typeof nameOrOptions === 'string' ? nameOrOptions : undefined;
	const resolved = typeof nameOrOptions === 'string' ? options : nameOrOptions;

	return { name, all, required: resolved?.required === true };
}

function hasReactiveHost(
	host: RefDecoratorHost,
): host is RefDecoratorHost & { [REACTIVE_HOST]: ReactiveHostInternals } {
	return REACTIVE_HOST in host;
}

/**
 * Installs the live `@ref` or `@refAll` getter on a host.
 *
 * @remarks
 * Standard adapters run this from `addInitializer`, legacy adapters from post-construction, like
 * `installQueryField`. Reads resolve through the scoped resolver every time, with no cache.
 *
 * The development checks run once per instance, from the host's post-sync pass on first connect, so a read
 * never pays for them. A duplicate that a later render introduces is not reported. `@refAll` skips the
 * duplicate check, since several parts under one name are what it reads.
 */
export function installRefField(host: RefDecoratorHost, propertyName: string, config: RefFieldConfig): void {
	const element = resolveHostElement(host);
	const name = config.name ?? toKebabCaseAttributeName(propertyName);
	const read = config.all ? () => resolveParts(element, name) : () => resolvePart(element, name);

	Object.defineProperty(host, propertyName, {
		get: read,
		enumerable: true,
		configurable: true,
	});

	if (!hasReactiveHost(host)) {
		return;
	}

	let checked = false;
	host[REACTIVE_HOST].registerPostSync(() => {
		if (checked) return;
		checked = true;

		const decorator = config.all ? '@refAll' : '@ref';
		const owner = `${host.constructor.name}:${element.localName}:${propertyName}`;
		const where = `${decorator} "${propertyName}" on <${element.localName}>`;

		if (config.required) {
			warnOnceInDevelopment(`${decorator}:required:${owner}`, () => {
				const found = read();
				const missing = Array.isArray(found) ? found.length === 0 : found === null;
				return missing
					? `[@ecopages/radiant] ${where} is required but no part data-ref="${name}" belongs to this host after its first connect. Check the name, or that the markup is not inside a nested host.`
					: undefined;
			});
		}

		if (!config.all) {
			warnOnceInDevelopment(`${decorator}:duplicate:${owner}`, () =>
				resolveParts(element, name).length > 1
					? `[@ecopages/radiant] ${where} found more than one part data-ref="${name}" in this host's scope, so it reads the first. Name each part once, or use @refAll to read them all.`
					: undefined,
			);
		}
	});
}
