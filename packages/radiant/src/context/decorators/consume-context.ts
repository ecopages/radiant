import type { ContextHostLike } from '../context-host';
import type { UnknownContext } from '../types';
import { consumeContext as legacyConsumeContext } from './legacy/consume-context';
import { consumeContext as standardConsumeContext } from './standard/consume-context';
import { fieldDecoratorBridge } from '../../decorators/bridge';

/**
 * Injects the nearest matching context provider onto a decorated field.
 *
 * During SSR the field can be resolved from the active SSR context stack; on
 * the client it falls back to the DOM event-based context channel.
 *
 * @param context Context token to consume from ancestor providers.
 * @returns A standard-or-legacy decorator implementation for the target field.
 */
export function consumeContext(context: UnknownContext) {
	function decorator<Host extends ContextHostLike, V>(
		protoOrTarget: undefined,
		nameOrContext: ClassFieldDecoratorContext<Host, V>,
	): void;
	function decorator(protoOrTarget: ContextHostLike, nameOrContext: string): void;
	function decorator(
		protoOrTarget: ContextHostLike | undefined,
		nameOrContext: string | ClassFieldDecoratorContext<ContextHostLike, unknown>,
	): void {
		return fieldDecoratorBridge(
			standardConsumeContext(context),
			legacyConsumeContext(context),
			protoOrTarget,
			nameOrContext,
		);
	}

	return decorator;
}
