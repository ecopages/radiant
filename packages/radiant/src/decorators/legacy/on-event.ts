import type { RadiantElement, RadiantElementEventListener } from '../../core/radiant-element';
import { registerLegacyInstanceInitializer } from './instance-initializers';

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
	return (proto: RadiantElement, _: string, descriptor: PropertyDescriptor) => {
		if ('window' in eventConfig) {
			registerLegacyInstanceInitializer(proto, (element) => {
				const boundHandler = descriptor.value.bind(element);
				element.registerConnectedCallback(() => {
					window.addEventListener(eventConfig.type, boundHandler, eventConfig.options);
				});
				element.registerCleanupCallback(() => {
					window.removeEventListener(eventConfig.type, boundHandler, eventConfig.options);
				});
			});

			return descriptor;
		}

		if ('document' in eventConfig) {
			registerLegacyInstanceInitializer(proto, (element) => {
				const boundHandler = descriptor.value.bind(element);
				element.registerConnectedCallback(() => {
					document.addEventListener(eventConfig.type, boundHandler, eventConfig.options);
				});
				element.registerCleanupCallback(() => {
					document.removeEventListener(eventConfig.type, boundHandler, eventConfig.options);
				});
			});

			return descriptor;
		}

		const selector = 'selector' in eventConfig ? eventConfig.selector : `[data-ref="${eventConfig.ref}"]`;
		const originalMethod = descriptor.value;

		registerLegacyInstanceInitializer(proto, (element) => {
			element.registerConnectedCallback(() => {
				element.subscribeEvent({
					selector: selector,
					type: eventConfig.type,
					listener: originalMethod.bind(element),
					options: eventConfig?.options ?? undefined,
				});
			});
		});

		return descriptor;
	};
}
