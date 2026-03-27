import type {
	LegacyFieldDecoratorArgs,
	StandardFieldDecoratorArgs,
	StandardOrLegacyFieldDecoratorArgs,
} from '../../types';
import type { UnknownContext } from '../types';
import { consumeContext as legacyConsumeContext } from './legacy/consume-context';
import { consumeContext as standardConsumeContext } from './standard/consume-context';

/**
 * Injects the nearest matching context provider onto a decorated field.
 *
 * During SSR the field can be resolved from the active SSR context stack; on
 * the client it falls back to the DOM event-based context channel.
 *
 * @param contextToProvide Context token to consume from ancestor providers.
 * @returns A standard-or-legacy decorator implementation for the target field.
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
