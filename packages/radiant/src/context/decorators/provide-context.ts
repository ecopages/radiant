import type { AttributeTypeConstant } from '../../utils';
import type { ContextHostLike } from '../context-host';
import type { ContextProvider } from '../context-provider';
import type { UnknownContext } from '../types';
import { provideContext as legacyProvideContext } from './legacy/provide-context';
import { provideContext as standardProvideContext } from './standard/provide-context';
import { boundedFieldDecorator, type BoundedFieldDecorator } from '../../decorators/bridge';

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
 * Creates a `ContextProvider` for the decorated field and makes it available to descendant consumers.
 * @param options {@link ProvideContextOptions}
 *
 * @remarks
 * The decorator always installs a provider, so under standard decorators the field has to be
 * `ContextProvider<T>` of the same context and cannot be optional.
 */
export function provideContext<T extends UnknownContext>(
	options: ProvideContextOptions<T>,
): BoundedFieldDecorator<ContextHostLike, ContextProvider<T>, ContextProvider<T>> {
	return boundedFieldDecorator(standardProvideContext(options), legacyProvideContext(options));
}
