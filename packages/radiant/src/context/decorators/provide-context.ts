import type {
	LegacyFieldDecoratorArgs,
	StandardFieldDecoratorArgs,
	StandardOrLegacyFieldDecoratorArgs,
} from '../../types';
import type { AttributeTypeConstant } from '../../utils';
import type { UnknownContext } from '../types';
import { provideContext as legacyProvideContext } from './legacy/provide-context';
import { provideContext as standardProvideContext } from './standard/provide-context';

export type ProvideContextOptions<T extends UnknownContext> = {
	context: T;
	initialValue?: T['__context__'];
	hydrate?: AttributeTypeConstant;
};

/**
 * A decorator to provide a context to the target element.
 * @param options {@link ProvideContextOptions}
 * @returns
 */
export function provideContext<T extends UnknownContext>(options: ProvideContextOptions<T>) {
	return function (
		protoOrTarget: StandardOrLegacyFieldDecoratorArgs['protoOrTarget'],
		nameOrContext: StandardOrLegacyFieldDecoratorArgs['nameOrContext'],
	): any {
		if (typeof nameOrContext === 'object') {
			return standardProvideContext(options)(
				protoOrTarget as StandardFieldDecoratorArgs['protoOrTarget'],
				nameOrContext as StandardFieldDecoratorArgs['nameOrContext'],
			);
		}
		return legacyProvideContext(options)(
			protoOrTarget as LegacyFieldDecoratorArgs['protoOrTarget'],
			nameOrContext as LegacyFieldDecoratorArgs['nameOrContext'],
		);
	};
}
