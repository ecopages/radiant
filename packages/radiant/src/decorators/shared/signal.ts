import type { WritableSignal } from '@ecopages/signals';
import { createHostSignal, HostSignal, isWritableSignalLike } from '../../signals/host-signal';
import { resolveHydrationKey } from '../../core/hydration-codec';
import { REACTIVE_HOST, type ReactiveHostLike } from '../../core/reactive-host';
import { warnDiscardedPreUpgradeValue } from './pre-upgrade-warning';
import type { SignalDecoratorOptions } from './signal-options';

/**
 * Builds the host signal for `@signal` and wires hydrate / source lifecycle.
 *
 * @remarks
 * `getWritableMember` runs first for its throw: a read-only member under this name must fail before any source callback or registration.
 * Standard adapters return this from the field initializer. Legacy adapters assign it during
 * post-construction so class-field writes do not overwrite the signal with `undefined`.
 */
export function installHostSignal<Value>(
	host: ReactiveHostLike,
	propertyName: string,
	options: SignalDecoratorOptions<Value>,
	initialValue: Value | WritableSignal<Value> | undefined,
): HostSignal<Value> {
	const current = host as unknown as Record<string, unknown>;
	const existing = current[propertyName];

	if (existing instanceof HostSignal) {
		return existing as HostSignal<Value>;
	}

	host[REACTIVE_HOST].getWritableMember(propertyName);

	const resolvedSource =
		typeof options.source === 'function'
			? options.source(host)
			: (options.source ?? (isWritableSignalLike<Value>(initialValue) ? initialValue : undefined));
	const resolvedInitialValue =
		resolvedSource !== undefined
			? options.initial
			: ((initialValue === undefined ? options.initial : initialValue) as Value);

	warnDiscardedPreUpgradeValue(host, propertyName, '@signal');

	const hostSignal = createHostSignal({
		host,
		hydrate: options.hydrate,
		hydrationKey: resolveHydrationKey(host, propertyName),
		initialValue: resolvedInitialValue,
		property: propertyName,
		source: resolvedSource,
	});

	host.registerConnectedCallback(() => {
		hostSignal.hydrateFromHost();
		hostSignal.connectToSource();
	});
	host.registerCleanupCallback(() => {
		hostSignal.disconnectFromSource();
	});

	if (options.hydrate) {
		host[REACTIVE_HOST].ssrRegistry.registerHydrationBinding(propertyName, hostSignal);
	}

	return hostSignal;
}
