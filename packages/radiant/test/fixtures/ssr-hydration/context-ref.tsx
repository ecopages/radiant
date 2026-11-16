import { type ContextProvider, consumeContext, createContext, provideContext } from '../../../src/context';
import { RadiantElement } from '../../../src/core/radiant-element';
import { customElement } from '../../../src/decorators/custom-element';

type PanelContext = { label: string; attachPanel?: (node: HTMLElement | null) => void };

const panelContext = createContext<PanelContext>(Symbol('hydrated-ref-panel-context'));

/**
 * A provider that hands descendants a JSX `ref` callback through its context and keeps the callback out of the
 * hydration payload.
 *
 * @remarks The callback writes a static field because legacy decorators install the provider after the constructor,
 * so a per-instance callback cannot be put in the context there.
 */
@customElement('hydrated-ref-provider-test')
export class HydratedRefProvider extends RadiantElement {
	static panel: HTMLElement | null = null;

	@provideContext({
		context: panelContext,
		initialValue: {
			label: 'panel',
			attachPanel: (node) => {
				HydratedRefProvider.panel = node;
			},
		},
		hydrate: Object,
		serialize: ({ label }) => ({ label }),
	})
	panelProvider!: ContextProvider<typeof panelContext>;

	override render() {
		return <hydrated-ref-consumer-test />;
	}
}

@customElement('hydrated-ref-consumer-test')
export class HydratedRefConsumer extends RadiantElement {
	@consumeContext(panelContext) panelProvider!: ContextProvider<typeof panelContext>;

	override render() {
		const { attachPanel, label } = this.panelProvider.getContext();
		return <section ref={attachPanel}>{label}</section>;
	}
}
