import { RadiantComponent, contextSelector, customElement, state } from '@ecopages/radiant';
import { type RadiantSlotStudioContextValue, radiantSlotStudioContext } from './radiant-slot-studio.context.ts';

type RadiantSlotStudioSummaryBindings = {
	summary: string;
};

@customElement('radiant-slot-studio-summary')
export class RadiantSlotStudioSummaryElement extends RadiantComponent<RadiantSlotStudioSummaryBindings> {
	@state summary = 'Awaiting board context';

	@contextSelector({ context: radiantSlotStudioContext })
	protected syncSummary(currentContext: RadiantSlotStudioContextValue): void {
		this.summary = `${currentContext.owner} is steering ${currentContext.highlight} in ${currentContext.stage.toLowerCase()} mode with ${currentContext.commits} commits queued.`;
	}

	override render() {
		return <p class="studio-summary">{this.$.summary}</p>;
	}
}
