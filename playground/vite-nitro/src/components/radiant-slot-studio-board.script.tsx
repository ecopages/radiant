import { RadiantElement, customElement, querySlot } from '@ecopages/radiant';
import { ContextProvider, provideContext } from '@ecopages/radiant/context';
import './radiant-slot-studio-insight.script.tsx';
import './radiant-slot-studio-summary.script.tsx';
import { radiantSlotStudioContext } from './radiant-slot-studio.context.ts';

const stageSequence: Array<'Build' | 'Review' | 'Ship'> = ['Build', 'Review', 'Ship'];
const tempoSequence: Array<'Calm' | 'Live' | 'Review'> = ['Calm', 'Live', 'Review'];

@customElement('radiant-slot-studio-board')
export class RadiantSlotStudioBoardElement extends RadiantElement {
	@querySlot({ all: true }) defaultSlotElements!: Element[];
	@querySlot({ name: 'sidebar' }) sidebarSlotElement!: Element | null;
	@querySlot({ name: 'footer' }) footerSlotElement!: Element | null;

	@provideContext({
		context: radiantSlotStudioContext,
		initialValue: {
			commits: 3,
			highlight: 'slot composition',
			owner: 'Design systems',
			stage: 'Build',
			tempo: 'Calm',
		},
		hydrate: Object,
	})
	context!: ContextProvider<typeof radiantSlotStudioContext>;

	private readonly advanceStage = () => {
		const currentContext = this.context.getContext();
		const nextStage = stageSequence[(stageSequence.indexOf(currentContext.stage) + 1) % stageSequence.length];
		this.context.setContext({ stage: nextStage });
	};

	private readonly logCommit = () => {
		const currentContext = this.context.getContext();
		this.context.setContext({ commits: currentContext.commits + 1 });
	};

	private readonly rotateTempo = () => {
		const currentContext = this.context.getContext();
		const nextTempo = tempoSequence[(tempoSequence.indexOf(currentContext.tempo) + 1) % tempoSequence.length];
		this.context.setContext({ tempo: nextTempo });
	};

	override render() {
		const projectedComponent = this.defaultSlotElements.find((element) => element.tagName.includes('-'));
		const bodyElementCount = this.defaultSlotElements.length;
		const projectedComponentTag = projectedComponent?.tagName.toLowerCase() ?? 'none';
		const slotInventory = `${bodyElementCount} body region${bodyElementCount === 1 ? '' : 's'}, ${this.sidebarSlotElement ? 'sidebar ready' : 'no sidebar'}, ${this.footerSlotElement ? 'footer ready' : 'no footer'}`;

		return (
			<section class="component-card component-card--studio">
				<slot name="eyebrow">
					<p class="component-tag">Slots + context studio</p>
				</slot>
				<slot name="heading">
					<h3>Composed workspace board</h3>
				</slot>
				<radiant-slot-studio-summary />
				<p class="studio-slot-meta">
					<code>@querySlot</code> sees {slotInventory}. Projected custom element:{' '}
					<code>{projectedComponentTag}</code>.
				</p>
				<div class="studio-layout">
					<aside class="studio-sidebar">
						<slot name="sidebar">
							<p class="component-copy">
								Use the named slots to inject a brief, checklist, or callout without rewriting the board
								shell.
							</p>
						</slot>
					</aside>
					<div class="studio-main">
						<slot>
							<p class="component-copy">
								This default slot can host planning notes, release copy, or any other light-DOM
								fragment.
							</p>
						</slot>
						<div class="studio-insights" role="list">
							<radiant-slot-studio-insight kind="stage" />
							<radiant-slot-studio-insight kind="tempo" />
							<radiant-slot-studio-insight kind="commits" />
						</div>
					</div>
				</div>
				<div class="component-actions">
					<button type="button" on:click={this.advanceStage}>
						Advance stage
					</button>
					<button type="button" on:click={this.rotateTempo}>
						Rotate tempo
					</button>
					<button type="button" on:click={this.logCommit}>
						Log commit
					</button>
				</div>
				<slot name="footer">
					<p class="studio-footer">
						Projected regions stay editable while nested consumers react to shared context.
					</p>
				</slot>
			</section>
		);
	}
}
