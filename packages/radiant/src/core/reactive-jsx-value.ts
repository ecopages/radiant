import type { SubscribableJsxValue } from '@ecopages/jsx';
import type { RadiantElement } from './radiant-element';

/**
 * Creates a stable JSX child binding backed by a Radiant reactive property or field.
 *
 * The returned value resolves eagerly on the server and subscribes to the host's
 * update callbacks on the client so the mounted child range can patch directly
 * when the selected property changes.
 */
export function bindReactiveValue<Host extends RadiantElement>(host: Host, property: string): SubscribableJsxValue {
	return host.bind(String(property));
}
