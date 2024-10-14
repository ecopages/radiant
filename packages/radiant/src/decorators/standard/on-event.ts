import type { RadiantElement, RadiantElementEventListener } from '../../core/radiant-element';
import type { Method } from '../../types';

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
 * @param eventConfig The event configuration.
 * @param eventConfig.selectors The CSS selector(s) of the target element(s).
 * @param eventConfig.ref The data-ref attribute of the target element.
 * @param eventConfig.type The type of the event to listen for.
 * @param eventConfig.options Optional. An options object that specifies characteristics about the event listener.
 */
export function onEvent(eventConfig: OnEventConfig) {
  return function <T extends Method>(originalMethod: T, context: ClassMethodDecoratorContext): void {
    context.addInitializer(function (this: any) {
      const boundMethod = originalMethod.bind(this);

      if ('window' in eventConfig) {
        window.addEventListener(eventConfig.type, boundMethod, eventConfig.options);
        (this as RadiantElement).registerCleanupCallback(() => {
          window.removeEventListener(eventConfig.type, boundMethod, eventConfig.options);
        });
      }

      if ('document' in eventConfig) {
        document.addEventListener(eventConfig.type, boundMethod, eventConfig.options);
        (this as RadiantElement).registerCleanupCallback(() => {
          document.removeEventListener(eventConfig.type, boundMethod, eventConfig.options);
        });
      }

      const selector =
        'selector' in eventConfig ? eventConfig.selector : 'ref' in eventConfig && `[data-ref="${eventConfig.ref}"]`;

      if (selector) {
        (this as RadiantElement).subscribeEvent({
          selector: selector,
          type: eventConfig.type,
          listener: boundMethod,
          options: eventConfig?.options ?? undefined,
        });
      }
    });
  };
}
