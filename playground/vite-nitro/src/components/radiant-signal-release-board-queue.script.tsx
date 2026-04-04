import { RadiantComponent, contextSelector, customElement } from '@ecopages/radiant';
import { radiantSignalReleaseBoardContext } from './radiant-signal-release-board.context.ts';
import { createEmptyReleaseBoardQueueView, type ReleaseBoardStore } from './radiant-signal-release-board.model.ts';

@customElement('radiant-signal-release-board-queue')
export class RadiantSignalReleaseBoardQueueElement extends RadiantComponent {
	@contextSelector({ context: radiantSignalReleaseBoardContext, select: (value) => value?.store })
	store: ReleaseBoardStore | undefined;

	override render() {
		const view = this.store?.views.queue.get() ?? createEmptyReleaseBoardQueueView();

		return (
			<section class="signal-story__queue-panel">
				<div class="component-actions signal-story__actions">
					<button type="button" on:click={view.actions.cycleFilter}>
						Cycle filter
					</button>
					<button type="button" on:click={view.actions.focusNextTicket} disabled={!view.canFocusNext}>
						Focus next
					</button>
					<button
						type="button"
						on:click={view.actions.advanceSelectedTicket}
						disabled={!view.canAdvanceSelected}
					>
						Advance selected
					</button>
					<button type="button" on:click={view.actions.syncWithNitro} disabled={view.isSyncing}>
						{view.syncButtonLabel}
					</button>
				</div>
				<ul class="signal-story__ticket-list">
					{view.tickets.map((ticket) => (
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
									on:click={() => view.actions.focusTicket(ticket.id)}
									disabled={ticket.isSelected}
								>
									{ticket.focusLabel}
								</button>
								<button type="button" on:click={() => view.actions.toggleBlocked(ticket.id)}>
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
