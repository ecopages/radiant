import type {
	LegacyFieldDecoratorArgs,
	StandardFieldDecoratorArgs,
	StandardOrLegacyFieldDecoratorArgs,
} from '../types';
import { reactiveField as legacyReactiveField } from './legacy/reactive-field';
import { reactiveField as standardReactiveField } from './standard/reactive-field';

/**
 * A decorator to define a reactive field.
 * Every time the field changes, the `notifyUpdate` method will be called.
 */
export function reactiveField(
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
