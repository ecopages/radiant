import type {
	LegacyFieldDecoratorArgs,
	StandardFieldDecoratorArgs,
	StandardOrLegacyFieldDecoratorArgs,
} from '../types';
import { jsxState as legacyJsxState } from './legacy/jsx-state';
import { jsxState as standardJsxState } from './standard/jsx-state';

/**
 * JSX-first reactive state decorator.
 *
 * `@jsxState` models internal component state and exposes a bound JSX companion
 * accessor by default so JSX child updates can patch directly.
 */
export function jsxState(
	protoOrTarget: StandardOrLegacyFieldDecoratorArgs['protoOrTarget'],
	nameOrContext: StandardOrLegacyFieldDecoratorArgs['nameOrContext'],
): any {
	if (typeof nameOrContext === 'object') {
		return standardJsxState(
			protoOrTarget as StandardFieldDecoratorArgs['protoOrTarget'],
			nameOrContext as StandardFieldDecoratorArgs['nameOrContext'],
		);
	}

	return legacyJsxState(
		protoOrTarget as LegacyFieldDecoratorArgs['protoOrTarget'],
		nameOrContext as LegacyFieldDecoratorArgs['nameOrContext'],
	);
}
