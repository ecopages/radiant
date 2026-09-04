import type { ReactiveHostLike } from '../../core/reactive-host';
import { createQuery, type QueryHostTarget } from '../../helpers/create-query';
import { resolveHostElementOrNull } from '../../helpers/resolve-host-element';

type BindToTransform<T> = {
	invert?: true;
	map?: (value: T) => unknown;
};

type BindToKind = { attr: string } | { bool: string } | { prop: string } | { text: true };

type BindToWrite<T> = BindToTransform<T> & BindToKind;

/**
 * One DOM write driven by a reactive field.
 *
 * Exactly one of `attr`, `bool`, `prop`, or `text`. `ref` and `selector` are
 * mutually exclusive; omit both to patch the host element.
 *
 * `T` is the decorated field type. `@bindTo` infers it, so `map` callbacks do
 * not need a parameter annotation.
 *
 * @remarks
 * The union catches a missing write kind. Two write kinds, or both `ref` and
 * `selector`, throw when the decorator is applied — excess-property checking
 * does not reject a key that exists on another union member.
 */
export type BindToTarget<T = unknown> =
	| (BindToWrite<T> & { ref: string })
	| (BindToWrite<T> & { selector: string })
	| BindToWrite<T>;

/**
 * Host surface `@bindTo` needs: reactive-member reads plus the decorator
 * registration hooks, on an element or controller query target.
 */
export type BindToHost = Pick<
	ReactiveHostLike,
	'getReactiveMember' | 'registerPostSyncCallback' | 'registerUpdateCallback'
> &
	QueryHostTarget;

export type CompiledBindToTarget = (host: BindToHost, value: unknown) => void;

/**
 * Compiles each target into a single write: resolve the node, then patch it.
 *
 * @remarks
 * Validates each target once per decoration. The union does not reject
 * `{ attr, bool }` or `{ ref, selector }`; this assert names those conflicts.
 */
export function compileBindToTargets(target: BindToTarget | readonly BindToTarget[]): readonly CompiledBindToTarget[] {
	const targets = Array.isArray(target) ? target : [target];

	for (const entry of targets) {
		assertValidBindToTarget(entry);
	}

	return targets.map(compileBindToTarget);
}

/**
 * Writes the current field value to every configured target.
 *
 * @remarks
 * Missing nodes are skipped. A field that is not a registered reactive member
 * is skipped too — there is no signal to read or subscribe to, so a write
 * would only clobber seeded DOM.
 */
export function applyBindToTargets(
	host: BindToHost,
	propertyName: string,
	targets: readonly CompiledBindToTarget[],
): void {
	const member = host.getReactiveMember(propertyName);

	if (!member) {
		return;
	}

	const value = member.get();

	for (const write of targets) {
		write(host, value);
	}
}

function assertValidBindToTarget(target: BindToTarget): void {
	if ('ref' in target && 'selector' in target) {
		throw new TypeError('[@ecopages/radiant] @bindTo() cannot set both `ref` and `selector`.');
	}

	const kinds =
		Number('attr' in target) + Number('bool' in target) + Number('prop' in target) + Number('text' in target);

	if (kinds !== 1) {
		throw new TypeError(
			'[@ecopages/radiant] @bindTo() requires exactly one of `attr`, `bool`, `prop`, or `text`.',
		);
	}
}

function compileBindToTarget(target: BindToTarget): CompiledBindToTarget {
	const map = target.map as ((value: unknown) => unknown) | undefined;
	const invert = target.invert;
	const resolve = compileResolve(target);
	const write = compileWrite(target);

	return (host, rawValue) => {
		const element = resolve(host);

		if (!element) {
			return;
		}

		const value = map ? map(rawValue) : rawValue;
		write(element, invert ? !value : value);
	};
}

function compileResolve(target: BindToTarget): (host: BindToHost) => Element | null {
	if ('ref' in target) {
		const { ref } = target;
		return (host) => createQuery<Element>(host, { ref, cache: false }).value;
	}

	if ('selector' in target) {
		const { selector } = target;
		return (host) => createQuery<Element>(host, { selector, cache: false }).value;
	}

	return resolveHostElementOrNull;
}

function compileWrite(target: BindToTarget): (element: Element, value: unknown) => void {
	if ('bool' in target) {
		const { bool } = target;
		return (element, value) => element.toggleAttribute(bool, Boolean(value));
	}

	if ('attr' in target) {
		const { attr } = target;
		return (element, value) => {
			if (value == null) {
				element.removeAttribute(attr);
				return;
			}

			element.setAttribute(attr, String(value));
		};
	}

	if ('prop' in target) {
		const { prop } = target;
		return (element, value) => {
			(element as unknown as Record<string, unknown>)[prop] = value;
		};
	}

	return (element, value) => {
		element.textContent = value == null ? '' : String(value);
	};
}
