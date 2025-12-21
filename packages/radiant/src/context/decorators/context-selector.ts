import type {
	LegacyMethodDecoratorArgs,
	StandardMethodDecoratorArgs,
	StandardOrLegacyMethodDecoratorArgs,
} from '../../types';
import type { Context, UnknownContext } from '../types';
import { contextSelector as legacyContextSelector } from './legacy/context-selector';
import { contextSelector as standardContextSelector } from './standard/context-selector';

export type SubscribeToContextOptions<T extends UnknownContext> = {
	context: T;
	select?: (context: T['__context__']) => unknown;
	subscribe?: boolean;
};

/**
 * A decorator to subscribe to a context selector.
 * @param option {@link SubscribeToContextOptions}
 * @returns
 */
export function contextSelector<T extends Context<unknown, unknown>>(options: SubscribeToContextOptions<T>) {
	return function (
		protoOrTarget: StandardOrLegacyMethodDecoratorArgs['protoOrTarget'],
		nameOrContext: StandardOrLegacyMethodDecoratorArgs['nameOrContext'],
		descriptor?: StandardOrLegacyMethodDecoratorArgs['descriptor'],
	): any {
		if (typeof nameOrContext === 'object') {
			return standardContextSelector(options)(
				protoOrTarget as StandardMethodDecoratorArgs['protoOrTarget'],
				nameOrContext as StandardMethodDecoratorArgs['nameOrContext'],
			);
		}
		return legacyContextSelector(options)(
			protoOrTarget as LegacyMethodDecoratorArgs['protoOrTarget'],
			nameOrContext as LegacyMethodDecoratorArgs['nameOrContext'],
			descriptor as LegacyMethodDecoratorArgs['descriptor'],
		);
	};
}
