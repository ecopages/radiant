import {
	runLegacyInstanceInitializers,
	runLegacyPostConstructionInitializers,
} from './instance-initializers';

export type LegacyHostReadinessPhase = 'construct' | 'connect' | 'ssr';

/**
 * Runs legacy decorator initialization for the requested lifecycle phase.
 *
 * Post-construction work is idempotent — multiple calls with `connect` or `ssr`
 * only execute each registered initializer once per instance.
 */
export function ensureLegacyHostReady<T extends object>(host: T, phase: LegacyHostReadinessPhase): void {
	switch (phase) {
		case 'construct':
			runLegacyInstanceInitializers(host);
			break;
		case 'connect':
		case 'ssr':
			runLegacyPostConstructionInitializers(host);
			break;
	}
}
