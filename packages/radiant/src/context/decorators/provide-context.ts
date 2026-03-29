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
	/** Context token made available to descendant consumers. */
	context: T;
	/** Client-side default value installed before any SSR hydration is merged. */
	initialValue?: T['__context__'];
	/** Attribute type used to opt the provider into SSR hydration. */
	hydrate?: AttributeTypeConstant;
	/**
	 * Projects the current provider value into an SSR-safe hydration payload.
	 *
	 * Use this when the live client context includes instances or other values
	 * that should stay client-only. When `hydrate: Object` is active, the parsed
	 * payload merges back into `initialValue`, so omitted members keep their
	 * client-side defaults.
	 */
	serialize?: (value: T['__context__']) => unknown;
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
