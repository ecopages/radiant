import type { BindingKind } from './hydration-bindings.ts';

/**
 * Hydration marker policy for Ecopages JSX.
 *
 * This module governs the SSR-emission side of the hydration marker contract:
 * which binding kinds get marker attributes written into the HTML, and which
 * binding kinds should emit a serialized attribute value alongside the marker.
 *
 * The SSR emission path (`server-render.ts`) and the plain JSX serializer
 * (`jsx-runtime.ts` `renderJsxRenderableToString`) consult this module
 * instead of embedding inline prefix checks.
 *
 * The client-side hydration recovery path (`dom-render.ts`,
 * `dom-render/hydration.ts`) is intentionally generic — it processes whatever
 * markers it finds in the DOM without consulting this module. That is correct
 * because recovery is driven by what the SSR side chose to emit. If
 * `needsHydrationMarker` changes for a given kind, the client will
 * automatically stop recovering it because the marker will no longer appear.
 *
 * ## Binding kind behavior
 *
 * | Kind           | SSR marker | Emits attribute value | Reason                                   |
 * |----------------|------------|-----------------------|------------------------------------------|
 * | `attr`         | yes        | yes                   | Standard attribute, recoverable from DOM  |
 * | `bool`         | yes        | yes (presence-based)  | Boolean attribute, recoverable from DOM   |
 * | `event`        | yes        | no                    | Delegated event, client-only binding      |
 * | `native-event` | yes        | no                    | Direct event, client-only binding         |
 * | `prop`         | yes        | no                    | Property binding, not serializable to DOM |
 */

/**
 * Returns whether the SSR renderer should emit a hydration marker attribute
 * for the given binding kind.
 *
 * All binding kinds currently require markers so the client hydrator can
 * recover them. This function exists so that decision is stated once rather
 * than implied by the absence of a skip condition.
 *
 * @param _kind Binding kind to evaluate.
 * @returns `true` when an SSR hydration marker should be emitted.
 */
export function needsHydrationMarker(_kind: BindingKind): boolean {
	return true;
}

/**
 * Returns whether the SSR renderer should emit the serialized attribute
 * value alongside the hydration marker for the given binding kind.
 *
 * Client-only bindings (events, native events, properties) have no
 * meaningful attribute representation, so their values are omitted from
 * the SSR output.
 *
 * @param kind Binding kind to evaluate.
 * @returns `true` when the SSR output should include the attribute value.
 */
export function shouldEmitAttributeValue(kind: BindingKind): boolean {
	switch (kind) {
		case 'event':
		case 'native-event':
		case 'prop':
			return false;
		case 'attr':
		case 'bool':
			return true;
	}
}

/**
 * Returns whether the given binding kind is a client-only binding that
 * should not attempt to serialize a value into the SSR HTML output.
 *
 * This is the inverse of {@link shouldEmitAttributeValue} and exists as a
 * convenience for call sites that read more naturally with "is this
 * client-only?" semantics.
 *
 * @param kind Binding kind to evaluate.
 * @returns `true` when the binding is client-only.
 */
export function isClientOnlyBinding(kind: BindingKind): boolean {
	return !shouldEmitAttributeValue(kind);
}
