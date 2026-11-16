import type { ContextHostLike } from '../../context-host';
import type { ContextProvider } from '../../context-provider';
import type { UnknownContext } from '../../types';
import type { ProvideContextOptions } from '../provide-context';
import { installContextProvider } from '../shared/provide-context';

export function provideContext<T extends UnknownContext>(options: ProvideContextOptions<T>) {
	return <C extends ContextHostLike, V extends ContextProvider<T>>(
		target: undefined,
		targetContext: ClassFieldDecoratorContext<C, V>,
	) => {
		void target;
		const contextName = String(targetContext.name);
		targetContext.addInitializer(function (this: C) {
			installContextProvider(this, contextName, options);
		});
	};
}
