/** @jsxImportSource @ecopages/jsx */

import {
	type ContextProvider,
	RadiantComponent,
	consumeContext,
	contextSelector,
	customElement,
	onUpdated,
	reactiveField,
} from '@ecopages/radiant';
import { radiantContextFlowContext } from './radiant-context-flow.context';

@customElement('radiant-context-flow-leaf')
export class RadiantContextFlowLeafElement extends RadiantComponent {
	@consumeContext(radiantContextFlowContext)
	declare context: ContextProvider<typeof radiantContextFlowContext>;

	@reactiveField private summary?: string;

	@onUpdated('summary')
	protected rerenderView(): void {
		this.update();
	}

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

		if (!providedContext && !this.summary && hydratedSummary) {
			return (
				<p class="component-metric" data-ref="context-summary">
					{hydratedSummary}
				</p>
			);
		}

		const summary = providedContext
			? `${providedContext.label} / ${providedContext.level}`
			: (this.summary ?? 'Pending context');

		return (
			<p class="component-metric" data-ref="context-summary">
				Context: {summary}
			</p>
		);
	}
}
