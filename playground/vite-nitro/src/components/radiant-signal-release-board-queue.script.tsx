import { RadiantComponent, contextSelector, customElement, state } from '@ecopages/radiant';
import { radiantSignalReleaseBoardContext } from './radiant-signal-release-board.context.ts';
import {
	createEmptyReleaseBoardQueueView,
	type ReleaseBoardQueueView,
	type ReleaseBoardStore,
} from './radiant-signal-release-board.model.ts';

@customElement('radiant-signal-release-board-queue')
export class RadiantSignalReleaseBoardQueueElement extends RadiantComponent<{ view: ReleaseBoardQueueView }> {
	@state view = createEmptyReleaseBoardQueueView();
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
		this.view = store.views.queue.get();
		this.requestUpdate();
		this.stopViewSync = store.views.queue.subscribe((view) => {
			this.view = view;
			this.requestUpdate();
		});
	}

	override render() {
		return (
			<section class="signal-story__queue-panel">
				<div class="component-actions signal-story__actions">
					<button type="button" on:click={this.view.actions.cycleFilter}>
						Cycle filter
					</button>
					<button
						type="button"
						on:click={this.view.actions.focusNextTicket}
						disabled={!this.view.canFocusNext}
					>
						Focus next
					</button>
					<button
						type="button"
						on:click={this.view.actions.advanceSelectedTicket}
						disabled={!this.view.canAdvanceSelected}
					>
						Advance selected
					</button>
					<button type="button" on:click={this.view.actions.syncWithNitro} disabled={this.view.isSyncing}>
						{this.view.syncButtonLabel}
					</button>
				</div>
				<ul class="signal-story__ticket-list">
					{this.view.tickets.map((ticket) => (
						<li
							class="signal-story__ticket"
							data-blocked={ticket.blocked ? 'true' : 'false'}
							data-lane={ticket.laneToken}
							data-selected={ticket.isSelected ? 'true' : 'false'}
						>
							<div class="signal-story__ticket-copy">
								<p class="signal-story__ticket-title">{ticket.title}</p>
								<p class="signal-story__ticket-meta">
									{ticket.owner} · {ticket.lane} · {ticket.impact} impact
								</p>
								<p class="signal-story__ticket-notes">{ticket.notes}</p>
							</div>
							<div class="signal-story__ticket-controls">
								<button
									type="button"
									on:click={() => this.view.actions.focusTicket(ticket.id)}
									disabled={ticket.isSelected}
								>
									{ticket.focusLabel}
								</button>
								<button type="button" on:click={() => this.view.actions.toggleBlocked(ticket.id)}>
									{ticket.blockerLabel}
								</button>
							</div>
						</li>
					))}
				</ul>
			</section>
		);
	}
}
