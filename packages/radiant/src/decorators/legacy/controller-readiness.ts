import { getReactivePropDefinitions } from '../../core/reactive-prop-metadata';
import { ensureLegacyHostReady } from './host-readiness';
import { hasRunLegacyPostConstructionInitializers } from './instance-initializers';

/**
 * Runs the connect-time legacy setup of a controller that `@controller` did not wrap.
 *
 * @remarks
 * Such a class is set up here, at its first connect, where a field initializer and a write made after `new` are
 * both an own data property. Every defined own `@prop` value is taken as the author's: it is replayed through the
 * accessor once that exists, so it wins over the `defaultValue` and over a value the host element held. A wrapped
 * controller, or one rendered on the server, has already been set up and is left alone.
 */
export function ensureLegacyControllerReady(controller: object): void {
	if (hasRunLegacyPostConstructionInitializers(controller)) {
		return;
	}

	const authored: [string, unknown][] = [];

	for (const { name } of getReactivePropDefinitions(controller)) {
		const value = Object.prototype.hasOwnProperty.call(controller, name)
			? (controller as Record<string, unknown>)[name]
			: undefined;

		if (value !== undefined) {
			authored.push([name, value]);
		}
	}

	ensureLegacyHostReady(controller, 'connect');

	for (const [name, value] of authored) {
		Reflect.set(controller, name, value);
	}
}
