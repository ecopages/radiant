import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { RadiantElement, customElement, state } from '@ecopages/radiant';
import { ContextProvider, provideContext } from '@ecopages/radiant/context';
import './radiant-slot-studio-insight.script.tsx';
import './radiant-slot-studio-summary.script.tsx';
import { radiantSlotStudioContext } from './radiant-slot-studio.context.ts';

const stageSequence: Array<'Build' | 'Review' | 'Ship'> = ['Build', 'Review', 'Ship'];
const tempoSequence: Array<'Calm' | 'Live' | 'Review'> = ['Calm', 'Live', 'Review'];

export type RadiantSlotStudioBoardProps = {
	children?: JsxRenderable;
	eyebrow?: JsxRenderable;
	footer?: JsxRenderable;
	heading?: JsxRenderable;
	sidebar?: JsxRenderable;
};

/**
 * A board that places its children as slotted content and takes its other regions as properties.
 *
 * @remarks The inventory line reads `slottedElements`, which is empty until the first client render, so it is
 * filled in `onConnected()` and the server renders a placeholder.
 */
@customElement('radiant-slot-studio-board')
export class RadiantSlotStudioBoardElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: RadiantSlotStudioBoardProps;
	@state eyebrow: JsxRenderable = null;
	@state heading: JsxRenderable = null;
	@state sidebar: JsxRenderable = null;
	@state footer: JsxRenderable = null;
	@state slotInventory = 'Reading slotted content...';

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

	override onConnected() {
		const elements = this.slottedElements;
		const component = elements.find((element) => element.tagName.includes('-'));
		this.slotInventory = `${elements.length} body region${elements.length === 1 ? '' : 's'}, ${this.sidebar ? 'sidebar ready' : 'no sidebar'}, ${this.footer ? 'footer ready' : 'no footer'}. Slotted custom element: ${component?.tagName.toLowerCase() ?? 'none'}.`;
	}

	override render() {
		return (
			<section class="component-card component-card--studio">
				{this.eyebrow ?? <p class="component-tag">Slots + context studio</p>}
				{this.heading ?? <h3>Composed workspace board</h3>}
				<radiant-slot-studio-summary />
				<p class="studio-slot-meta">
					<code>slottedElements</code> sees {this.slotInventory}
				</p>
				<div class="studio-layout">
					<aside class="studio-sidebar">
						{this.sidebar ?? (
							<p class="component-copy">
								Pass a sidebar property to inject a brief, checklist, or callout without rewriting the
								board shell.
							</p>
						)}
					</aside>
					<div class="studio-main">
						{this.slotted ?? (
							<p class="component-copy">
								The board's children can be planning notes, release copy, or any other light-DOM
								fragment.
							</p>
						)}
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
				{this.footer ?? (
					<p class="studio-footer">Slotted regions stay editable while nested consumers react to shared context.</p>
				)}
			</section>
		);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'radiant-slot-studio-board': RadiantSlotStudioBoardElement;
	}
}
