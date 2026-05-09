import type { SubscribableJsxValue } from '@ecopages/jsx';
import type { RadiantElement } from './radiant-element';
import type { ReactiveBindingValue } from './reactive-prop-core';

/**
 * Creates a stable JSX child binding backed by a Radiant reactive property or field.
 *
 * The returned value resolves eagerly on the server and subscribes to the host's
 * update callbacks on the client so the mounted child range can patch directly
 * when the selected property changes.
 */
export function bindReactiveValue<
	Bindings extends object,
	Host extends RadiantElement<Bindings>,
	Property extends Extract<keyof Bindings, string>,
>(host: Host, property: Property): SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>> {
	return host.bind(property);
}
