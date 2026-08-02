import type { Method } from '../types';
import type { EventListenerHost, OnEventConfig, OnEventScope } from '../helpers/create-event-listener';
import { onEvent as legacyOnEvent } from './legacy/on-event';
import { onEvent as standardOnEvent } from './standard/on-event';
import { methodDecoratorBridge } from './bridge';

export type { OnEventConfig, OnEventScope };

/**
 * A decorator to subscribe to an event on the target element.
 * The event listener will be automatically unsubscribed when the element is disconnected.
 *
 * Note: Selector- and ref-based listeners use event delegation, which means they rely on
 * event bubbling. Therefore, they will not work with events that do not bubble, such as
 * `focus`, `blur`, `load`, `unload`, `scroll`, etc. For focus and blur events, consider
 * using `focusin` and `focusout` which are similar but do bubble. Delegated listeners
 * observe the host light DOM by default, and can optionally observe the shadow root or both
 * trees. `window`, `document`, and `mediaQuery` targets attach directly instead of delegating.
 *
 * @param options {@link OnEventConfig} The event configuration.
 */
export function onEvent(options: OnEventConfig) {
	function decorator<Host extends EventListenerHost, TMethod extends Method>(
		protoOrTarget: TMethod,
		nameOrContext: ClassMethodDecoratorContext<Host, TMethod>,
	): void;
	function decorator(
		protoOrTarget: EventListenerHost,
		nameOrContext: string,
		descriptor: TypedPropertyDescriptor<Method>,
	): TypedPropertyDescriptor<Method> | void;
	function decorator(
		protoOrTarget: EventListenerHost | Method,
		nameOrContext: string | ClassMethodDecoratorContext<EventListenerHost, Method>,
		descriptor?: TypedPropertyDescriptor<Method>,
	): TypedPropertyDescriptor<Method> | void {
		return methodDecoratorBridge(
			standardOnEvent(options),
			legacyOnEvent(options),
			protoOrTarget,
			nameOrContext,
			descriptor,
		);
	}

	return decorator;
}
