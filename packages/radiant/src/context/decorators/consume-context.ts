import type {
	LegacyFieldDecoratorArgs,
	StandardFieldDecoratorArgs,
	StandardOrLegacyFieldDecoratorArgs,
} from '../../types';
import type { UnknownContext } from '../types';
import { consumeContext as legacyConsumeContext } from './legacy/consume-context';
import { consumeContext as standardConsumeContext } from './standard/consume-context';

/**
 * A decorator to provide a context to the target element.
 * @param contextToProvide
 * @returns
 */
export function consumeContext(contextToProvide: UnknownContext) {
	return function (
		protoOrTarget: StandardOrLegacyFieldDecoratorArgs['protoOrTarget'],
		nameOrContext: StandardOrLegacyFieldDecoratorArgs['nameOrContext'],
	): any {
		if (typeof nameOrContext === 'object') {
			return standardConsumeContext(contextToProvide)(
				protoOrTarget as StandardFieldDecoratorArgs['protoOrTarget'],
				nameOrContext as StandardFieldDecoratorArgs['nameOrContext'],
			);
		}
		return legacyConsumeContext(contextToProvide)(
			protoOrTarget as LegacyFieldDecoratorArgs['protoOrTarget'],
			nameOrContext as LegacyFieldDecoratorArgs['nameOrContext'],
		);
	};
}
