import type { RadiantElementEventListener } from '../core/radiant-element';
import type { StandardOrLegacyMethodDecoratorArgs } from '../types';
import type {
	OnEventConfig as HelperOnEventConfig,
	OnEventScope as HelperOnEventScope,
} from '../helpers/create-event-listener';
import { onEvent as legacyOnEvent } from './legacy/on-event';
import { onEvent as standardOnEvent } from './standard/on-event';
import { methodDecoratorBridge } from './bridge';

export type OnEventScope = HelperOnEventScope;
export type OnEventConfig = HelperOnEventConfig;

/**
 * A decorator to subscribe to an event on the target element.
 * The event listener will be automatically unsubscribed when the element is disconnected.
 *
 * Note: This decorator uses event delegation, which means it relies on event bubbling.
 * Therefore, it will not work with events that do not bubble, such as `focus`, `blur`, `load`, `unload`, `scroll`, etc.
 * For focus and blur events, consider using `focusin` and `focusout` which are similar but do bubble.
 * Delegated listeners observe the host light DOM by default, and can optionally observe the shadow root or both trees.
 *
 * @param options {@link OnEventConfig} The event configuration.
 */
export function onEvent(options: OnEventConfig) {
	return function (
		protoOrTarget: StandardOrLegacyMethodDecoratorArgs['protoOrTarget'],
		nameOrContext: StandardOrLegacyMethodDecoratorArgs['nameOrContext'],
		descriptor?: StandardOrLegacyMethodDecoratorArgs['descriptor'],
	): any {
		return methodDecoratorBridge(
			standardOnEvent(options),
			legacyOnEvent(options),
			protoOrTarget,
			nameOrContext,
			descriptor,
		);
	};
}
