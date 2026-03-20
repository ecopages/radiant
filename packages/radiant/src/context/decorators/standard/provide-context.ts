import type { RadiantElement } from '../../../core/radiant-element';
import { ContextProvider } from '../../context-provider';
import type { UnknownContext } from '../../types';
import type { ProvideContextOptions } from '../provide-context';

export function provideContext<T extends UnknownContext>({ context, initialValue, hydrate }: ProvideContextOptions<T>) {
	return <C extends RadiantElement, V>(_: undefined, targetContext: ClassFieldDecoratorContext<C, V>) => {
		const contextName = String(targetContext.name);
		targetContext.addInitializer(function (this: C) {
			const provider = new ContextProvider<T>(this, {
				context,
				hydrationKey: contextName,
				initialValue,
				hydrate,
			});
			(this as any)[contextName] = provider;
			this.registerContextProvider(contextName, provider);
			this.connectedContextCallback(context);
		});
	};
}
