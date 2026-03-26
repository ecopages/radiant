import { RadiantComponent, contextSelector, customElement, prop, state } from '@ecopages/radiant';
import { type RadiantSlotStudioContextValue, radiantSlotStudioContext } from './radiant-slot-studio.context.ts';

type InsightKind = 'commits' | 'stage' | 'tempo';

type RadiantSlotStudioInsightBindings = {
	kind: InsightKind;
	summary: string;
};

@customElement('radiant-slot-studio-insight')
export class RadiantSlotStudioInsightElement extends RadiantComponent<RadiantSlotStudioInsightBindings> {
	@prop({ type: String }) kind: InsightKind = 'stage';
	@state summary = 'Pending';

	@contextSelector({ context: radiantSlotStudioContext })
	protected syncSummary(currentContext: RadiantSlotStudioContextValue): void {
		switch (this.kind) {
			case 'commits':
				this.summary = `${currentContext.commits} synced`;
				break;
			case 'tempo':
				this.summary = currentContext.tempo;
				break;
			default:
				this.summary = currentContext.stage;
		}
	}

	override render() {
		const labels: Record<InsightKind, string> = {
			commits: 'Commits',
			stage: 'Stage',
			tempo: 'Tempo',
		};

		return (
			<div class="studio-insight" data-kind={this.kind}>
				<p class="studio-insight__label">{labels[this.kind]}</p>
				<p class="studio-insight__value">{this.$.summary}</p>
			</div>
		);
	}
}
