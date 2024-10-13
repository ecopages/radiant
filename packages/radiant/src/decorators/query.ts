import type {
  LegacyFieldDecoratorArgs,
  StandardFieldDecoratorArgs,
  StandardOrLegacyFieldDecoratorArgs,
} from '../types';
import { query as legacyQuery } from './legacy/query';
import { query as standardQuery } from './standard/query';

type BaseQueryConfig = {
  all?: boolean;
  cache?: boolean;
};

type QueryBySelector = { selector: string };

type QueryByRef = { ref: string };

export type QueryConfig = BaseQueryConfig & (QueryBySelector | QueryByRef);

/**
 * A decorator to query by CSS selector or data-ref attribute.
 * By default it queries for the first element that matches the selector, but it can be configured to query for all elements.
 * It cache the result by default, but it can be configured to not cache it.
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
