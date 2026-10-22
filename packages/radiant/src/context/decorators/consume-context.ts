import type { ContextHostLike } from '../context-host';
import type { ContextProvider } from '../context-provider';
import type { UnknownContext } from '../types';
import { consumeContext as legacyConsumeContext } from './legacy/consume-context';
import { consumeContext as standardConsumeContext } from './standard/consume-context';
import { boundedFieldDecorator, type BoundedFieldDecorator } from '../../decorators/bridge';

/**
 * Injects the nearest matching context provider onto a decorated field.
 *
 * During SSR the field can be resolved from the active SSR context stack; on
 * the client it falls back to the DOM event-based context channel.
 *
 * @param context Context token to consume from ancestor providers.
 *
 * @remarks
 * Under standard decorators the field has to be `ContextProvider<C>`, with or without `undefined`, which it
 * holds until a provider connects. A narrower type, such as a provider subclass, cannot hold the provider and
 * is rejected, and so is a wider one.
 */
export function consumeContext<C extends UnknownContext>(
	context: C,
): BoundedFieldDecorator<ContextHostLike, ContextProvider<C> | undefined, ContextProvider<C>> {
	return boundedFieldDecorator(standardConsumeContext(context), legacyConsumeContext(context));
}
