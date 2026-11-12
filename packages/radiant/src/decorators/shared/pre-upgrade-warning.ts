import type { ReactiveHostLike } from '../../core/reactive-host';
import { HAS_PRE_UPGRADE_VALUE } from '../../core/pre-upgrade-value';
import { getReactivePropDefinitions } from '../../core/reactive-prop-metadata';
import { areJsxDevWarningsEnabled, warnOnceInDevelopment } from '../../helpers/dev-warnings';

/**
 * Warns in development that a value assigned to a host before upgrade was discarded by an internal member.
 *
 * @remarks
 * `@prop` adopts a pre-upgrade value; `@state` and `@signal` are internal and keep their initializer, so the
 * assignment is lost. The warning fires once per element tag and member, from both the standard and the legacy
 * decorators. The check wraps the warning instead of returning early, because some bundlers (Rollup) keep the
 * code after an early `return` inside a `try`; the `try` keeps an unbundled browser load, where `process` does
 * not exist, from throwing.
 *
 * @example
 * ```tsx
 * @customElement('x-renderer')
 * class XRenderer extends RadiantElement {
 * 	@prop({ type: Object }) engine?: FormEngine; // public input: adopted when set before upgrade
 * 	@state status = 'idle'; // internal: a pre-upgrade value is discarded
 * }
 *
 * const el = document.querySelector('x-renderer')!;
 * el.engine = myEngine;
 * el.status = 'ready';
 * await import('./x-renderer'); // upgrade
 * el.engine; // myEngine
 * el.status; // 'idle', and development builds warn:
 * // [@ecopages/radiant] "status" on <x-renderer> was assigned before the element was upgraded, but @state is
 * // internal: the value was discarded and the initializer was kept. Declare it with @prop to accept it as public input.
 * ```
 *
 * The same applies to a class accessor, which a pre-upgrade assignment shadows (see {@link warnShadowedClassAccessors}):
 *
 * ```tsx
 * class XRenderer extends RadiantElement {
 * 	accessor mode = 'a'; // or a hand-written get/set, or a library's `@observable accessor`
 * }
 * el.mode = 'b'; // before upgrade
 * // [@ecopages/radiant] "mode" on <x-renderer> was assigned before the element was upgraded and now shadows the
 * // class accessor, so the accessor (and any reactivity behind it) never sees it. Declare it with @prop, or after
 * // upgrade save the value, delete the own property, and re-assign it so it goes through the setter.
 * ```
 *
 * To accept a value from outside the host, declare it with `@prop`.
 */
export function warnDiscardedPreUpgradeValue(
	host: ReactiveHostLike,
	memberName: string,
	decorator: '@state' | '@signal',
): void {
	const tag = (host as unknown as Element).localName;
	warnOnceInDevelopment(`${tag}:${memberName}`, () =>
		host[HAS_PRE_UPGRADE_VALUE]?.(memberName)
			? `[@ecopages/radiant] "${memberName}" on <${tag}> was assigned before the element was upgraded, but ${decorator} is internal: the value was discarded and the initializer was kept. Declare it with @prop to accept it as public input.`
			: undefined,
	);
}

/**
 * Warns in development for each property assigned to a host before upgrade that now shadows an accessor
 * defined by the host's own class chain.
 *
 * @remarks
 * Hand-written `get`/`set`, `accessor` fields and third-party accessor decorators (such as MobX
 * `@observable accessor`) live on the prototype; an own property set before upgrade takes precedence over
 * them, so the accessor and any reactivity behind it never sees the value. Run from the `RadiantElement`
 * constructor, before class fields are defined. The chain is walked below `RadiantElement`, and `@prop`
 * names are skipped because `@prop` adopts the value. `@state` and `@signal` warn through
 * {@link warnDiscardedPreUpgradeValue}; the shared once-per-tag-and-member set keeps a name from warning twice.
 */
export function warnShadowedClassAccessors(host: HTMLElement, baseProto: object): void {
	try {
		if (process.env.NODE_ENV !== 'production' && areJsxDevWarningsEnabled()) {
			const ownNames = Object.getOwnPropertyNames(host);
			if (ownNames.length === 0) return;

			const propNames = new Set(getReactivePropDefinitions(host).map((definition) => definition.name));
			for (const name of ownNames) {
				if (propNames.has(name) || !hasClassAccessor(host, name, baseProto)) continue;
				const tag = host.localName;
				warnOnceInDevelopment(
					`${tag}:${name}`,
					() =>
						`[@ecopages/radiant] "${name}" on <${tag}> was assigned before the element was upgraded and now shadows the class accessor, so the accessor (and any reactivity behind it) never sees it. Declare it with @prop, or after upgrade save the value, delete the own property, and re-assign it so it goes through the setter.`,
				);
			}
		}
	} catch {}
}

function hasClassAccessor(host: object, name: string, baseProto: object): boolean {
	for (let proto = Object.getPrototypeOf(host); proto && proto !== baseProto; proto = Object.getPrototypeOf(proto)) {
		const descriptor = Object.getOwnPropertyDescriptor(proto, name);
		if (descriptor) return !!(descriptor.get || descriptor.set);
	}
	return false;
}
