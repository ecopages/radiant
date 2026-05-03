import type { StandardOrLegacyFieldDecoratorArgs } from '../types';
import type { QueryConfig, QueryScope } from '../helpers/create-query';
import { query as legacyQuery } from './legacy/query';
import { query as standardQuery } from './standard/query';
import { fieldDecoratorBridge } from './bridge';

export type { QueryConfig, QueryScope };

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
		return fieldDecoratorBridge(standardQuery(options), legacyQuery<T>(options), protoOrTarget, nameOrContext);
	};
}
