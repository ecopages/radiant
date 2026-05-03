import type { StandardOrLegacyMethodDecoratorArgs } from '../types';
import { debounce as legacyDebounce } from './legacy/debounce';
import { debounce as standardDebounce } from './standard/debounce';
import { methodDecoratorBridge } from './bridge';

/**
 * A decorator to debounce a method.
 * @param timeout The debounce timeout in milliseconds.
 */
export function debounce(timeout: number) {
	return function (
		protoOrTarget: StandardOrLegacyMethodDecoratorArgs['protoOrTarget'],
		nameOrContext: StandardOrLegacyMethodDecoratorArgs['nameOrContext'],
		descriptor?: StandardOrLegacyMethodDecoratorArgs['descriptor'],
	): any {
		return methodDecoratorBridge(
			standardDebounce(timeout),
			legacyDebounce(timeout),
			protoOrTarget,
			nameOrContext,
			descriptor,
		);
	};
}
