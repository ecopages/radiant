import type { WritableSignal } from '@ecopages/signals';
import { ContextProvider, RadiantComponent, customElement, provideContext, signal } from '@ecopages/radiant';
import './radiant-signal-release-board-focus.script.tsx';
import './radiant-signal-release-board-queue.script.tsx';
import {
	type ReleaseFilter,
	type ReleaseStoryTicket,
	type ReleaseSyncState,
	radiantSignalReleaseBoardContext,
} from './radiant-signal-release-board.context.ts';
import {
	createReleaseBoardStore,
	initialReleaseBoardTickets,
	nextFilter,
	nextLane,
	resolveVisibleTickets,
} from './radiant-signal-release-board.model.ts';

@customElement('radiant-signal-release-board')
export class RadiantSignalReleaseBoardElement extends RadiantComponent {
	@provideContext({ context: radiantSignalReleaseBoardContext })
	declare boardContext: ContextProvider<typeof radiantSignalReleaseBoardContext>;

	@signal({ hydrate: Array, initial: initialReleaseBoardTickets }) declare tickets: WritableSignal<
		ReleaseStoryTicket[]
	>;
	@signal({ hydrate: Number, initial: 101 }) declare selectedTicketId: WritableSignal<number>;
	@signal({ hydrate: String, initial: 'all' }) declare filter: WritableSignal<ReleaseFilter>;
	@signal({ hydrate: String, initial: 'idle' }) declare syncState: WritableSignal<ReleaseSyncState>;
	@signal({
		hydrate: String,
		initial: 'Rehearsal queue is ready. Pull a Nitro brief to simulate launch-day coordination.',
	})
	declare syncSummary: WritableSignal<string>;
	@signal({ hydrate: String, initial: 'Not synced yet' }) declare lastSyncAt: WritableSignal<string>;

	private releaseBoardStore?: ReturnType<typeof createReleaseBoardStore>;

	override connectedCallback(): void {
		this.syncBoardContext();
		super.connectedCallback();
	}

	private readonly cycleFilter = () => {
		this.filter.set(nextFilter(this.filter.get()));
		this.ensureVisibleSelection();
	};

	private readonly focusTicket = (ticketId: number) => {
		this.selectedTicketId.set(ticketId);
	};

	private readonly focusNextTicket = () => {
		const visibleTickets = resolveVisibleTickets(this.filter.get(), this.tickets.get());

		if (visibleTickets.length === 0) {
			return;
		}

		const currentIndex = visibleTickets.findIndex((ticket) => ticket.id === this.selectedTicketId.get());
		const nextTicket = visibleTickets[(currentIndex + 1) % visibleTickets.length] ?? visibleTickets[0];

		if (nextTicket) {
			this.selectedTicketId.set(nextTicket.id);
		}
	};

	private readonly advanceSelectedTicket = () => {
		const selectedTicketId = this.selectedTicketId.get();

		this.tickets.update((tickets) =>
			tickets.map((ticket) => {
				if (ticket.id !== selectedTicketId) {
					return ticket;
				}

				return {
					...ticket,
					blocked: false,
					lane: nextLane(ticket.lane),
					notes:
						ticket.lane === 'Launch'
							? 'Ticket looped back to backlog for the next rehearsal pass.'
							: `Moved into ${nextLane(ticket.lane)} with launch notes refreshed.`,
				};
			}),
		);

		this.ensureVisibleSelection();
	};

	private readonly toggleBlocked = (ticketId: number) => {
		this.tickets.update((tickets) =>
			tickets.map((ticket) =>
				ticket.id === ticketId
					? {
							...ticket,
							blocked: !ticket.blocked,
							notes: ticket.blocked
								? `${ticket.title} is unblocked and ready for the next handoff.`
								: `${ticket.title} is waiting on a cross-team dependency before it can proceed.`,
						}
					: ticket,
			),
		);

		this.ensureVisibleSelection();
	};

	private readonly syncWithNitro = async () => {
		if (this.syncState.get() === 'loading') {
			return;
		}

		this.syncState.set('loading');
		this.syncSummary.set('Calling /api/hello to simulate a release-brief sync.');

		try {
			const response = await fetch('/api/hello');

			if (!response.ok) {
				throw new Error(`Request failed with ${response.status}`);
			}

			const payload = (await response.json()) as {
				message: string;
				runtime: string;
				generatedAt: string;
			};

			const tickets = this.tickets.get();
			const selectedTicket =
				tickets.find((ticket) => ticket.id === this.selectedTicketId.get()) ?? tickets[0] ?? null;
			const launchReadyCount = tickets.filter((ticket) => ticket.lane === 'Launch' && !ticket.blocked).length;

			this.syncState.set('ready');
			this.syncSummary.set(
				`${payload.message} via ${payload.runtime}. ${selectedTicket?.title ?? 'Current focus'} now anchors ${launchReadyCount} launch-ready ticket${launchReadyCount === 1 ? '' : 's'}.`,
			);
			this.lastSyncAt.set(payload.generatedAt);
		} catch (error) {
			this.syncState.set('error');
			this.syncSummary.set(error instanceof Error ? error.message : 'Unknown error');
			this.lastSyncAt.set('n/a');
		}
	};

	private ensureVisibleSelection(): void {
		const visibleTickets = resolveVisibleTickets(this.filter.get(), this.tickets.get());

		if (visibleTickets.length === 0) {
			return;
		}

		if (visibleTickets.some((ticket) => ticket.id === this.selectedTicketId.get())) {
			return;
		}

		this.selectedTicketId.set(visibleTickets[0].id);
	}

	private syncBoardContext(): void {
		this.boardContext.setContext({ store: this.store });
	}

	private get store() {
		if (this.releaseBoardStore) {
			return this.releaseBoardStore;
		}

		this.releaseBoardStore = createReleaseBoardStore({
			actions: {
				advanceSelectedTicket: this.advanceSelectedTicket,
				cycleFilter: this.cycleFilter,
				focusNextTicket: this.focusNextTicket,
				focusTicket: this.focusTicket,
				syncWithNitro: this.syncWithNitro,
				toggleBlocked: this.toggleBlocked,
			},
			state: {
				filter: this.filter,
				lastSyncAt: this.lastSyncAt,
				selectedTicketId: this.selectedTicketId,
				syncState: this.syncState,
				syncSummary: this.syncSummary,
				tickets: this.tickets,
			},
		});

		return this.releaseBoardStore;
	}

	override render() {
		const board = this.store.views.board.get();
		this.syncBoardContext();

		return (
			<section class="component-card component-card--signals">
				<p class="component-tag">Signal decorator story</p>
				<h3>Release command deck</h3>
				<p class="component-copy">
					This board keeps the queue, active filter, selected ticket, and async Nitro brief in{' '}
					<code>@signal</code> fields. Derived <code>computed(...)</code> state is pushed through context so
					the focus and queue panels stay small and isolated.
				</p>
				<div class="signal-story__toolbar">
					<p class="status component-status" data-status={board.boardTone}>
						Board: {board.boardTone}
					</p>
					<p class="signal-story__chip">Filter: {board.filterLabel}</p>
					<p class="signal-story__chip">Visible: {board.visibleCount}</p>
					<p class="signal-story__chip">Blocked: {board.blockedCount}</p>
				</div>
				<p class="signal-story__headline">{board.headline}</p>
				<p class="signal-story__lane-summary">{board.laneBreakdown}</p>
				<div class="signal-story__layout">
					<radiant-signal-release-board-focus />
					<radiant-signal-release-board-queue />
				</div>
			</section>
		);
	}
}
