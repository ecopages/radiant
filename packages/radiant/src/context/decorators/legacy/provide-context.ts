import { ContextProvider } from '../../../context/context-provider';
import type { UnknownContext } from '../../../context/types';
import type { RadiantElement } from '../../../core/radiant-element';
import type { ProvideContextOptions } from '../provide-context';

export function provideContext<T extends UnknownContext>({ context, initialValue, hydrate }: ProvideContextOptions<T>) {
	return (proto: RadiantElement, propertyKey: string) => {
		const originalConnectedCallback = proto.connectedCallback;

		proto.connectedCallback = function (this: RadiantElement) {
			(this as any)[propertyKey] = new ContextProvider<T>(this, { context, initialValue, hydrate });
			originalConnectedCallback.call(this);
			this.connectedContextCallback(context);
		};
	};
}
