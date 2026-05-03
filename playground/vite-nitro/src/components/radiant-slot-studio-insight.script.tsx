import { RadiantElement, customElement, prop } from '@ecopages/radiant';
import { contextSelector } from '@ecopages/radiant/context';
import { type RadiantSlotStudioContextValue, radiantSlotStudioContext } from './radiant-slot-studio.context.ts';

type InsightKind = 'commits' | 'stage' | 'tempo';

type RadiantSlotStudioInsightBindings = {
	kind: InsightKind;
};

@customElement('radiant-slot-studio-insight')
export class RadiantSlotStudioInsightElement extends RadiantElement<RadiantSlotStudioInsightBindings> {
	@prop({ type: String }) kind: InsightKind = 'stage';

	@contextSelector({ context: radiantSlotStudioContext })
	context: RadiantSlotStudioContextValue | undefined;

	override render() {
		const labels: Record<InsightKind, string> = {
			commits: 'Commits',
			stage: 'Stage',
			tempo: 'Tempo',
		};

		let summary = 'Pending';
		if (this.context) {
			switch (this.kind) {
				case 'commits':
					summary = `${this.context.commits} synced`;
					break;
				case 'tempo':
					summary = this.context.tempo;
					break;
				default:
					summary = this.context.stage;
			}
		}

		return (
			<div class="studio-insight" data-kind={this.kind}>
				<p class="studio-insight__label">{labels[this.kind]}</p>
				<p class="studio-insight__value">{summary}</p>
			</div>
		);
	}
}
