import type { RadiantElementEventListener } from '../core/radiant-element';
import type {
  LegacyMethodDecoratorArgs,
  StandardMethodDecoratorArgs,
  StandardOrLegacyMethodDecoratorArgs,
} from '../types';
import { onEvent as legacyOnEvent } from './legacy/on-event';
import { onEvent as standardOnEvent } from './standard/on-event';

type OnEventConfig = Pick<RadiantElementEventListener, 'type' | 'options'> &
  (
    | {
        selector: string;
      }
    | {
        ref: string;
      }
    | {
        window: boolean;
      }
    | {
        document: boolean;
      }
  );

/**
 * A decorator to subscribe to an event on the target element.
 * The event listener will be automatically unsubscribed when the element is disconnected.
 *
 * Note: This decorator uses event delegation, which means it relies on event bubbling.
 * Therefore, it will not work with events that do not bubble, such as `focus`, `blur`, `load`, `unload`, `scroll`, etc.
 * For focus and blur events, consider using `focusin` and `focusout` which are similar but do bubble.
 *
 * @param options {@link OnEventConfig} The event configuration.
 */
export function onEvent(options: OnEventConfig) {
  return function (
    protoOrTarget: StandardOrLegacyMethodDecoratorArgs['protoOrTarget'],
    nameOrContext: StandardOrLegacyMethodDecoratorArgs['nameOrContext'],
    descriptor?: StandardOrLegacyMethodDecoratorArgs['descriptor'],
  ): any {
    if (typeof nameOrContext === 'object') {
      return standardOnEvent(options)(
        protoOrTarget as StandardMethodDecoratorArgs['protoOrTarget'],
        nameOrContext as StandardMethodDecoratorArgs['nameOrContext'],
      );
    }
    return legacyOnEvent(options)(
      protoOrTarget as LegacyMethodDecoratorArgs['protoOrTarget'],
      nameOrContext as LegacyMethodDecoratorArgs['nameOrContext'],
      descriptor as LegacyMethodDecoratorArgs['descriptor'],
    );
  };
}
