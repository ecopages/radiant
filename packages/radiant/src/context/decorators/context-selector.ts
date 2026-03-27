import type {
	LegacyMethodDecoratorArgs,
	StandardMethodDecoratorArgs,
	StandardOrLegacyMethodDecoratorArgs,
} from '../../types';
import type { Context, UnknownContext } from '../types';
import { contextSelector as legacyContextSelector } from './legacy/context-selector';
import { contextSelector as standardContextSelector } from './standard/context-selector';

export type SubscribeToContextOptions<T extends UnknownContext> = {
	/** Context token to resolve from ancestor providers. */
	context: T;
	/** Optional projection that narrows the resolved context before delivery. */
	select?: (context: T['__context__']) => unknown;
	/** Whether client-side event-channel subscriptions should stay active after the first value. */
	subscribe?: boolean;
};

/**
 * Subscribes a method to the current value, or a selected slice, of a context.
 *
 * The decorated method is invoked during SSR when an ambient provider is
 * available, and on the client it will keep receiving updates according to the
 * `subscribe` option.
 *
 * @param options Context subscription configuration.
 * @returns A standard-or-legacy decorator implementation for the target method.
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
