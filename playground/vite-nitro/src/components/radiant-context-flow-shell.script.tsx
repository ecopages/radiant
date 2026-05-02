import { ContextProvider, RadiantElement, customElement, provideContext } from '@ecopages/radiant';
import './radiant-context-flow-leaf.script';
import { radiantContextFlowContext } from './radiant-context-flow.context';

@customElement('radiant-context-flow-shell')
export class RadiantContextFlowShellElement extends RadiantElement {
	@provideContext({
		context: radiantContextFlowContext,
		initialValue: { label: 'Nitro SSR context', level: 2 },
		hydrate: Object,
	})
	declare context: ContextProvider<typeof radiantContextFlowContext>;

	private readonly incrementContextLevel = () => {
		const currentContext = this.context.getContext();
		this.context.setContext({ level: currentContext.level + 1 });
	};

	override render() {
		return (
			<section class="component-card component-card--context">
				<p class="component-tag">SSR context flow</p>
				<h3>Nested RadiantElement context</h3>
				<p class="component-copy">
					This card SSR-renders a nested RadiantElement consumer and restores provider context from an
					automatic hydration script inside the host.
				</p>
				<radiant-context-flow-leaf />
				<div class="component-actions">
					<button type="button" on:click={this.incrementContextLevel}>
						Increase context level
					</button>
				</div>
			</section>
		);
	}
}
