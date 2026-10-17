import type { WritableSignal } from '@ecopages/signals';
import { ContextProvider, createContext, provideContext } from '../../src/context';
import { RadiantController } from '../../src/core/radiant-controller';
import { signal } from '../../src/decorators/signal';

export const postConstructionContext = createContext<{ count: number }>(Symbol('post-construction-context'));

/** Shared by the client controller tests and the controller SSR test. */
export class LegacyPostConstructionController extends RadiantController {
	@provideContext<typeof postConstructionContext>({
		context: postConstructionContext,
		initialValue: { count: 1 },
	})
	provider!: ContextProvider<typeof postConstructionContext>;

	@signal({ initial: 'ready' })
	status!: WritableSignal<string>;

	override connect(): void {
		super.connect();
		this.host.setAttribute('data-context-count', String(this.provider.getContext().count));
		this.host.setAttribute('data-status', this.status.get());
	}
}
