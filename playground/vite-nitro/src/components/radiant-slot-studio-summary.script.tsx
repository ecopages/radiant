import { RadiantComponent, contextSelector, customElement } from '@ecopages/radiant';
import { radiantSlotStudioContext } from './radiant-slot-studio.context.ts';

type RadiantSlotStudioSummaryBindings = {
	summary: string;
};

@customElement('radiant-slot-studio-summary')
export class RadiantSlotStudioSummaryElement extends RadiantComponent<RadiantSlotStudioSummaryBindings> {
	@contextSelector({
		context: radiantSlotStudioContext,
		select: ({ owner, highlight, stage, commits }) =>
			`${owner} is steering ${highlight} in ${stage.toLowerCase()} mode with ${commits} commits queued.`,
	})
	summary: string = 'Awaiting board context';

	override render() {
		return <p class="studio-summary">{this.summary}</p>;
	}
}
