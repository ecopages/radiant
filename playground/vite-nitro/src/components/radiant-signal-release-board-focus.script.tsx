import { RadiantComponent, contextSelector, customElement, state } from '@ecopages/radiant';
import { radiantSignalReleaseBoardContext } from './radiant-signal-release-board.context.ts';
import {
	createEmptyReleaseBoardFocusView,
	type ReleaseBoardFocusView,
	type ReleaseBoardStore,
} from './radiant-signal-release-board.model.ts';

@customElement('radiant-signal-release-board-focus')
export class RadiantSignalReleaseBoardFocusElement extends RadiantComponent<{ view: ReleaseBoardFocusView }> {
	@state view = createEmptyReleaseBoardFocusView();
	private stopViewSync?: () => void;

	override connectedCallback(): void {
		super.connectedCallback();
		this.registerCleanupCallback(() => {
			this.stopViewSync?.();
			this.stopViewSync = undefined;
		});
	}

	@contextSelector({ context: radiantSignalReleaseBoardContext, select: (value) => value?.store })
	protected connectStore(store: ReleaseBoardStore | undefined): void {
		if (!store) {
			return;
		}

		this.stopViewSync?.();
		this.view = store.views.focus.get();
		this.requestUpdate();
		this.stopViewSync = store.views.focus.subscribe((view) => {
			this.view = view;
			this.requestUpdate();
		});
	}

	override render() {
		return (
			<section class="signal-story__focus-panel">
				<p class="signal-story__section-label">Focused handoff</p>
				<h4>{this.view.selectedTicketTitle}</h4>
				<p class="signal-story__focus-meta">{this.view.selectedTicketMeta}</p>
				<p class="component-copy">{this.view.selectedTicketNotes}</p>
				<ul class="signal-story__checklist">
					{this.view.checklist.map((item) => (
						<li>{item}</li>
					))}
				</ul>
				<p class="status component-status" data-status={this.view.syncState}>
					Sync: {this.view.syncState}
				</p>
				<p class="component-meta">Nitro brief: {this.view.syncSummary}</p>
				<p class="component-meta">Last sync: {this.view.lastSyncAt}</p>
			</section>
		);
	}
}
