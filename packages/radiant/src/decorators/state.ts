import type { StandardOrLegacyFieldDecoratorArgs } from '../types';
import { reactiveField as legacyReactiveField } from './legacy/reactive-field';
import { reactiveField as standardReactiveField } from './standard/reactive-field';
import { fieldDecoratorBridge } from './bridge';

/**
 * Declares internal mutable component state.
 *
 * Each write triggers `notifyUpdate` so update callbacks, bindings, and
 * `RadiantComponent` renders stay in sync. When no explicit binding option
 * is supplied, `RadiantComponent` hosts expose a JSX companion binding
 * accessor automatically while plain `RadiantElement` hosts keep binding
 * opt-in.
 */
export function state(
	protoOrTarget: StandardOrLegacyFieldDecoratorArgs['protoOrTarget'],
	nameOrContext: StandardOrLegacyFieldDecoratorArgs['nameOrContext'],
): any {
	return fieldDecoratorBridge(standardReactiveField, legacyReactiveField, protoOrTarget, nameOrContext);
}
