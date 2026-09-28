import type { BindingKind } from '../factory/template-shape.ts';

/**
 * Hydration marker policy for Ecopages JSX.
 *
 * Every binding kind gets an SSR marker attribute so the client hydrator can
 * reconnect it. This module governs the one decision that actually varies:
 * whether a serialized attribute *value* accompanies the marker.
 *
 * The client-side recovery path (`dom-render.ts`, `dom-render/hydration.ts`) is
 * intentionally generic — it processes whatever markers it finds in the DOM
 * without consulting this module. That is correct because recovery is driven by
 * what the SSR side chose to emit.
 *
 * ## Binding kind behavior
 *
 * | Kind           | Emits attribute value | Reason                                    |
 * |----------------|-----------------------|-------------------------------------------|
 * | `attr`         | yes                   | Standard attribute, recoverable from DOM  |
 * | `bool`         | yes (presence-based)  | Boolean attribute, recoverable from DOM   |
 * | `event`        | no                    | Delegated event, client-only binding      |
 * | `native-event` | no                    | Direct event, client-only binding         |
 * | `prop`         | no                    | Property binding, not serializable to DOM |
 */

/**
 * Returns whether the given binding kind is client-only and therefore has no
 * meaningful attribute representation in SSR output.
 *
 * @param kind Binding kind to evaluate.
 * @returns `true` when the SSR output should omit the attribute value.
 */
export function isClientOnlyBinding(kind: BindingKind): boolean {
	switch (kind) {
		case 'event':
		case 'native-event':
		case 'prop':
			return true;
		case 'attr':
		case 'bool':
			return false;
	}
}
