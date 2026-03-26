import type {
	LegacyFieldDecoratorArgs,
	StandardFieldDecoratorArgs,
	StandardOrLegacyFieldDecoratorArgs,
} from '../types';
import { reactiveField as legacyReactiveField } from './legacy/reactive-field';
import { reactiveField as standardReactiveField } from './standard/reactive-field';

/**
 * Semantic alias for `@reactiveField`.
 *
 * `@state` models internal mutable component state. When no explicit binding
 * option is supplied, `RadiantComponent` hosts expose a JSX companion binding
 * accessor automatically while plain `RadiantElement` hosts keep binding
 * opt-in.
 */
export function state(
	protoOrTarget: StandardOrLegacyFieldDecoratorArgs['protoOrTarget'],
	nameOrContext: StandardOrLegacyFieldDecoratorArgs['nameOrContext'],
): any {
	if (typeof nameOrContext === 'object') {
		return standardReactiveField(
			protoOrTarget as StandardFieldDecoratorArgs['protoOrTarget'],
			nameOrContext as StandardFieldDecoratorArgs['nameOrContext'],
		);
	}

	return legacyReactiveField(
		protoOrTarget as LegacyFieldDecoratorArgs['protoOrTarget'],
		nameOrContext as LegacyFieldDecoratorArgs['nameOrContext'],
	);
}
