import type { ReactivePropertyOptions } from '../core/radiant-element';
import type {
  LegacyFieldDecoratorArgs,
  StandardFieldDecoratorArgs,
  StandardOrLegacyFieldDecoratorArgs,
} from '../types';
import { reactiveProp as legacyReactiveProp } from './legacy/reactive-prop';
import { reactiveProp as standardReactiveProp } from './standard/reactive-prop';

/**
 * A decorator to define a reactive property.
 * Every time the property changes, the `updated` method will be called.
 * @param options {@link ReactivePropertyOptions} The options for the reactive property.
 */
export function reactiveProp<T = unknown>(options: ReactivePropertyOptions<T>) {
  return function (
    protoOrTarget: StandardOrLegacyFieldDecoratorArgs['protoOrTarget'],
    nameOrContext: StandardOrLegacyFieldDecoratorArgs['nameOrContext'],
  ): any {
    if (typeof nameOrContext === 'object') {
      return standardReactiveProp(options)(
        protoOrTarget as StandardFieldDecoratorArgs['protoOrTarget'],
        nameOrContext as StandardFieldDecoratorArgs['nameOrContext'],
      );
    }
    return legacyReactiveProp(options)(
      protoOrTarget as LegacyFieldDecoratorArgs['protoOrTarget'],
      nameOrContext as LegacyFieldDecoratorArgs['nameOrContext'],
    );
  };
}
