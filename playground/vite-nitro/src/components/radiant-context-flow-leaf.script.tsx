import {
	type ContextProvider,
	RadiantComponent,
	consumeContext,
	contextSelector,
	customElement,
	state,
} from '@ecopages/radiant';
import { radiantContextFlowContext } from './radiant-context-flow.context';

@customElement('radiant-context-flow-leaf')
export class RadiantContextFlowLeafElement extends RadiantComponent {
	@consumeContext(radiantContextFlowContext)
	declare context: ContextProvider<typeof radiantContextFlowContext>;

	@state summary?: string;

	@contextSelector({
		context: radiantContextFlowContext,
		select: (context) => `${context.label} / ${context.level}`,
	})
	protected onContextSummary(summary: string): void {
		this.summary = summary;
	}

	override render() {
		const providedContext = this.context?.getContext();
		const hydratedSummary = this.querySelector('[data-ref="context-summary"]')?.textContent ?? undefined;
		const providerSummary = providedContext ? `${providedContext.label} / ${providedContext.level}` : undefined;

		if (providerSummary && this.summary !== providerSummary) {
			this.summary = providerSummary;
		}

		if (!this.summary && hydratedSummary) {
			return (
				<p class="component-metric" data-ref="context-summary">
					{hydratedSummary}
				</p>
			);
		}

		return (
			<p class="component-metric" data-ref="context-summary">
				Context: {this.summary ?? 'Pending context'}
			</p>
		);
	}
}
