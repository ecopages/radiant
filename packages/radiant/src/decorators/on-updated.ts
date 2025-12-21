import type {
	LegacyMethodDecoratorArgs,
	StandardMethodDecoratorArgs,
	StandardOrLegacyMethodDecoratorArgs,
} from '../types';
import { onUpdated as legacyOnUpdated } from './legacy/on-updated';
import { onUpdated as standardOnUpdated } from './standard/on-updated';

/**
 * A decorator to bind a method to the instance.
 */
export function onUpdated(keyOrKeys: string | string[]) {
	return function (
		protoOrTarget: StandardOrLegacyMethodDecoratorArgs['protoOrTarget'],
		nameOrContext: StandardOrLegacyMethodDecoratorArgs['nameOrContext'],
		_descriptor?: StandardOrLegacyMethodDecoratorArgs['descriptor'],
	): any {
		if (typeof nameOrContext === 'object') {
			return standardOnUpdated(keyOrKeys)(
				protoOrTarget as StandardMethodDecoratorArgs['protoOrTarget'],
				nameOrContext as StandardMethodDecoratorArgs['nameOrContext'],
			);
		}
		return legacyOnUpdated(keyOrKeys)(
			protoOrTarget as LegacyMethodDecoratorArgs['protoOrTarget'],
			nameOrContext as LegacyMethodDecoratorArgs['nameOrContext'],
		);
	};
}
