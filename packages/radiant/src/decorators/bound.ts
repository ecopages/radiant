import type { StandardOrLegacyMethodDecoratorArgs } from '../types';
import { bound as legacyBound } from './legacy/bound';
import { bound as standardBound } from './standard/bound';
import { methodDecoratorBridge } from './bridge';

/**
 * A decorator to bind a method to the instance.
 */
export function bound(
	protoOrTarget: StandardOrLegacyMethodDecoratorArgs['protoOrTarget'],
	nameOrContext: StandardOrLegacyMethodDecoratorArgs['nameOrContext'],
	descriptor?: StandardOrLegacyMethodDecoratorArgs['descriptor'],
): any {
	return methodDecoratorBridge(standardBound, legacyBound, protoOrTarget, nameOrContext, descriptor);
}
