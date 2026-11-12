import type { ReactiveHostLike } from '../../core/reactive-host';
import { areJsxDevWarningsEnabled } from '../../helpers/dev-warnings';

let warnedMembers: Set<string> | undefined;

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
 * To accept a value from outside the host, declare it with `@prop`.
 */
export function warnDiscardedPreUpgradeValue(
	host: ReactiveHostLike,
	memberName: string,
	decorator: '@state' | '@signal',
): void {
	try {
		if (process.env.NODE_ENV !== 'production' && areJsxDevWarningsEnabled()) {
			if (!host.hasPreUpgradeValue?.(memberName)) return;

			const key = `${(host as unknown as Element).localName}:${memberName}`;
			const warned = (warnedMembers ??= new Set<string>());
			if (warned.has(key)) return;
			warned.add(key);

			console.warn(
				`[@ecopages/radiant] "${memberName}" on <${(host as unknown as Element).localName}> was assigned before the element was upgraded, but ${decorator} is internal: the value was discarded and the initializer was kept. Declare it with @prop to accept it as public input.`,
			);
		}
	} catch {}
}
