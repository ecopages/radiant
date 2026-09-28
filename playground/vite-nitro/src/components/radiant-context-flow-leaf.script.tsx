import { RadiantElement, customElement } from '@ecopages/radiant';
import { contextSelector } from '@ecopages/radiant/context';
import { radiantContextFlowContext } from './radiant-context-flow.context';

@customElement('radiant-context-flow-leaf')
export class RadiantContextFlowLeafElement extends RadiantElement {
	@contextSelector({
		context: radiantContextFlowContext,
		select: (context) => `${context.label} / ${context.level}`,
	})
	summary: string | undefined;

	override render() {
		return (
			<p class="component-metric" data-ref="context-summary">
				Context: {this.summary ?? 'Pending context'}
			</p>
		);
	}
}
