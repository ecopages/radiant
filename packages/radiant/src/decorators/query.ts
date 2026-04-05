import type {
	LegacyFieldDecoratorArgs,
	StandardFieldDecoratorArgs,
	StandardOrLegacyFieldDecoratorArgs,
} from '../types';
import type { QueryConfig as HelperQueryConfig, QueryScope as HelperQueryScope } from '../helpers/create-query';
import { query as legacyQuery } from './legacy/query';
import { query as standardQuery } from './standard/query';

export type QueryScope = HelperQueryScope;
export type QueryConfig = HelperQueryConfig;

/**
 * A decorator to query by CSS selector or data-ref attribute.
 * By default it queries for the first element that matches the selector, but it can be configured to query for all elements.
 * It caches the result only when `cache` is enabled.
 * Queries run against the host light DOM by default, but can be directed to the shadow root or both trees.
 * @param options {@link QueryConfig} The options for the reactive property.
 */
export function query<T extends Element | Element[]>(options: QueryConfig) {
	return function (
		protoOrTarget: StandardOrLegacyFieldDecoratorArgs['protoOrTarget'],
		nameOrContext: StandardOrLegacyFieldDecoratorArgs['nameOrContext'],
	): any {
		if (typeof nameOrContext === 'object') {
			return standardQuery(options)(
				protoOrTarget as StandardFieldDecoratorArgs['protoOrTarget'],
				nameOrContext as StandardFieldDecoratorArgs<HTMLElement, Element | Element[]>['nameOrContext'],
			);
		}
		return legacyQuery<T>(options)(
			protoOrTarget as LegacyFieldDecoratorArgs['protoOrTarget'],
			nameOrContext as LegacyFieldDecoratorArgs['nameOrContext'],
		);
	};
}
