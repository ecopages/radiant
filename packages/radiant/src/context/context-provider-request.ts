import type { UnknownContext } from './types';

export const CONTEXT_PROVIDER_REQUEST = 'radiant-context-provider-request';

/**
 * Asks the nearest Radiant provider of `context` for the provider instance itself.
 *
 * @remarks
 * Internal to Radiant and not part of the community context protocol, where a `context-request` callback receives
 * the context value. `@consumeContext` injects the `ContextProvider` (for `setContext`, `subscribe` and SSR
 * serialization), so it needs this separate channel. Not exported from `@ecopages/radiant/context`.
 */
export class ContextProviderRequestEvent extends Event {
	public handled = false;

	public constructor(
		public readonly context: UnknownContext,
		public readonly callback: (provider: unknown) => void,
	) {
		super(CONTEXT_PROVIDER_REQUEST, { bubbles: true, composed: true });
	}

	public override stopImmediatePropagation(): void {
		this.handled = true;
		super.stopImmediatePropagation();
	}
}
