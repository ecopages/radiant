import type { ContextHostLike } from '../../context-host';
import { ContextProvider } from '../../context-provider';
import type { UnknownContext } from '../../types';
import type { ProvideContextOptions } from '../provide-context';

export function provideContext<T extends UnknownContext>({
	context,
	initialValue,
	hydrate,
	serialize,
}: ProvideContextOptions<T>) {
	return <C extends ContextHostLike, V>(target: undefined, targetContext: ClassFieldDecoratorContext<C, V>) => {
		void target;
		const contextName = String(targetContext.name);
		targetContext.addInitializer(function (this: C) {
			const hostRecord = this as C & Record<string, unknown>;
			const provider = new ContextProvider<T>(this, {
				context,
				hydrationKey: contextName,
				initialValue,
				hydrate,
				serialize,
			});
			hostRecord[contextName] = provider;
			this.registerContextProvider(contextName, provider);
			this.connectedContextCallback(context);
		});
	};
}
