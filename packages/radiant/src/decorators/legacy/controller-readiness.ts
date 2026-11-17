import { getReactivePropDefinitions } from '../../core/reactive-prop-metadata';
import { ensureLegacyHostReady } from './host-readiness';
import { hasRunLegacyPostConstructionInitializers } from './instance-initializers';

/**
 * Runs the connect-time legacy setup of a controller that `@controller` did not wrap.
 *
 * @remarks
 * Such a class is set up here, at its first connect, where a field initializer and a write made after `new` are
 * both an own data property. Every defined own `@prop` data value is taken as the author's: it is replayed through
 * the accessor once that exists, so it wins over the `defaultValue` and over a value the host element held. A
 * wrapped controller, or one rendered on the server, has already been set up and is left alone, and an own
 * accessor (installed by the standard decorators) is never replayed, since writing through it would run
 * `transform.fromProperty` again and report a change nobody made.
 */
export function ensureLegacyControllerReady(controller: object): void {
	if (hasRunLegacyPostConstructionInitializers(controller)) {
		return;
	}

	const authored: [string, unknown][] = [];

	for (const { name } of getReactivePropDefinitions(controller)) {
		const descriptor = Object.getOwnPropertyDescriptor(controller, name);

		if (descriptor && 'value' in descriptor && descriptor.value !== undefined) {
			authored.push([name, descriptor.value]);
		}
	}

	ensureLegacyHostReady(controller, 'connect');

	for (const [name, value] of authored) {
		Reflect.set(controller, name, value);
	}
}
