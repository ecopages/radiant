import type {
	LegacyMethodDecoratorArgs,
	StandardMethodDecoratorArgs,
	StandardOrLegacyMethodDecoratorArgs,
} from '../types';
import { bound as legacyBound } from './legacy/bound';
import { bound as standardBound } from './standard/bound';

/**
 * A decorator to bind a method to the instance.
 */
export function bound(
	protoOrTarget: StandardOrLegacyMethodDecoratorArgs['protoOrTarget'],
	nameOrContext: StandardOrLegacyMethodDecoratorArgs['nameOrContext'],
	descriptor?: StandardOrLegacyMethodDecoratorArgs['descriptor'],
): any {
	if (typeof nameOrContext === 'object') {
		return standardBound(
			protoOrTarget as StandardMethodDecoratorArgs['protoOrTarget'],
			nameOrContext as StandardMethodDecoratorArgs['nameOrContext'],
		);
	}
	return legacyBound(
		protoOrTarget as LegacyMethodDecoratorArgs['protoOrTarget'],
		nameOrContext as LegacyMethodDecoratorArgs['nameOrContext'],
		descriptor as LegacyMethodDecoratorArgs['descriptor'],
	);
}
