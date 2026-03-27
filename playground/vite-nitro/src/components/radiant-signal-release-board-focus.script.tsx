import { RadiantComponent, contextSelector, customElement, state } from '@ecopages/radiant';
import { radiantSignalReleaseBoardContext } from './radiant-signal-release-board.context.ts';
import {
	createEmptyReleaseBoardFocusView,
	type ReleaseBoardStore,
} from './radiant-signal-release-board.model.ts';

@customElement('radiant-signal-release-board-focus')
export class RadiantSignalReleaseBoardFocusElement extends RadiantComponent {
	@state declare store: ReleaseBoardStore | undefined;

	@contextSelector({ context: radiantSignalReleaseBoardContext, select: (value) => value?.store })
	protected connectStore(store: ReleaseBoardStore | undefined): void {
		this.store = store;
	}

	override render() {
		const view = this.store?.views.focus.get() ?? createEmptyReleaseBoardFocusView();

		return (
			<section class="signal-story__focus-panel">
				<p class="signal-story__section-label">Focused handoff</p>
				<h4>{view.selectedTicketTitle}</h4>
				<p class="signal-story__focus-meta">{view.selectedTicketMeta}</p>
				<p class="component-copy">{view.selectedTicketNotes}</p>
				<ul class="signal-story__checklist">
					{view.checklist.map((item) => (
						<li>{item}</li>
					))}
				</ul>
				<p class="status component-status" data-status={view.syncState}>
					Sync: {view.syncState}
				</p>
				<p class="component-meta">Nitro brief: {view.syncSummary}</p>
				<p class="component-meta">Last sync: {view.lastSyncAt}</p>
			</section>
		);
	}
}
