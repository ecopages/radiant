import type {
  LegacyMethodDecoratorArgs,
  StandardMethodDecoratorArgs,
  StandardOrLegacyMethodDecoratorArgs,
} from '../types';
import { debounce as legacyDebounce } from './legacy/debounce';
import { debounce as standardDebounce } from './standard/debounce';

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
    if (typeof nameOrContext === 'object') {
      return standardDebounce(timeout)(
        protoOrTarget as StandardMethodDecoratorArgs['protoOrTarget'],
        nameOrContext as StandardMethodDecoratorArgs['nameOrContext'],
      );
    }
    return legacyDebounce(timeout)(
      protoOrTarget as LegacyMethodDecoratorArgs['protoOrTarget'],
      nameOrContext as LegacyMethodDecoratorArgs['nameOrContext'],
      descriptor as LegacyMethodDecoratorArgs['descriptor'],
    );
  };
}
