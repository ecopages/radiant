import { computed, createStore, snapshot, type Signal, type SignalStore } from '@ecopages/signals';
import type {
	ReleaseBoardActions,
	ReleaseBoardTicketView,
	ReleaseFilter,
	ReleaseLane,
	ReleaseStoryTicket,
	ReleaseSyncState,
} from './radiant-signal-release-board.context.ts';

export const laneSequence: ReleaseLane[] = ['Backlog', 'Build', 'Review', 'Launch'];
export const filterSequence: ReleaseFilter[] = ['all', 'blocked', 'launch-ready'];

export const initialReleaseBoardTickets: ReleaseStoryTicket[] = [
	{
		id: 101,
		title: 'Landing page orchestration',
		owner: 'Maya',
		lane: 'Review',
		blocked: false,
		eta: 'Today 16:00',
		impact: 'High',
		notes: 'Align hero analytics with launch-day attribution before final sign-off.',
	},
	{
		id: 102,
		title: 'Nitro edge cache checklist',
		owner: 'Jon',
		lane: 'Build',
		blocked: true,
		eta: 'Today 17:30',
		impact: 'High',
		notes: 'Waiting on the final cache-tag matrix from infrastructure.',
	},
	{
		id: 103,
		title: 'Docs release summary',
		owner: 'Ari',
		lane: 'Launch',
		blocked: false,
		eta: 'Scheduled 18:15',
		impact: 'Medium',
		notes: 'Editorial copy is approved and ready to publish once the board turns green.',
	},
	{
		id: 104,
		title: 'Partner webhook verification',
		owner: 'Liv',
		lane: 'Backlog',
		blocked: false,
		eta: 'Tomorrow 09:00',
		impact: 'Low',
		notes: 'Keep it queued unless launch telemetry shows partner traffic anomalies.',
	},
];

export type ReleaseBoardSnapshot = {
	filter: ReleaseFilter;
	lastSyncAt: string;
	selectedTicketId: number;
	syncState: ReleaseSyncState;
	syncSummary: string;
	tickets: ReleaseStoryTicket[];
};

export type ReleaseBoardState = SignalStore<ReleaseBoardSnapshot>;

export type ReleaseBoardView = {
	blockedCount: number;
	boardTone: ReleaseSyncState;
	filterLabel: string;
	headline: string;
	laneBreakdown: string;
	visibleCount: number;
};

export type ReleaseBoardFocusView = {
	checklist: string[];
	lastSyncAt: string;
	selectedTicketMeta: string;
	selectedTicketNotes: string;
	selectedTicketTitle: string;
	syncState: ReleaseSyncState;
	syncSummary: string;
};

export type ReleaseBoardQueueView = {
	actions: ReleaseBoardActions;
	canAdvanceSelected: boolean;
	canFocusNext: boolean;
	isSyncing: boolean;
	syncButtonLabel: string;
	tickets: ReleaseBoardTicketView[];
};

export type ReleaseBoardStore = {
	actions: ReleaseBoardActions;
	state: ReleaseBoardState;
	views: {
		board: Signal<ReleaseBoardView>;
		focus: Signal<ReleaseBoardFocusView>;
		queue: Signal<ReleaseBoardQueueView>;
	};
};

export type ReleaseBoardSyncPayload = {
	generatedAt: string;
	message: string;
	runtime: string;
};

export function nextLane(lane: ReleaseLane): ReleaseLane {
	return laneSequence[(laneSequence.indexOf(lane) + 1) % laneSequence.length] ?? 'Backlog';
}

export function nextFilter(filter: ReleaseFilter): ReleaseFilter {
	return filterSequence[(filterSequence.indexOf(filter) + 1) % filterSequence.length] ?? 'all';
}

/** Creates a fresh plain snapshot for the release-board app state. */
export function createInitialReleaseBoardState(overrides: Partial<ReleaseBoardSnapshot> = {}): ReleaseBoardSnapshot {
	return {
		filter: overrides.filter ?? 'all',
		lastSyncAt: overrides.lastSyncAt ?? 'Not synced yet',
		selectedTicketId: overrides.selectedTicketId ?? 101,
		syncState: overrides.syncState ?? 'idle',
		syncSummary:
			overrides.syncSummary ??
			'Rehearsal queue is ready. Pull a Nitro brief to simulate launch-day coordination.',
		tickets: cloneReleaseBoardTickets(overrides.tickets ?? initialReleaseBoardTickets),
	};
}

/** Materializes a per-instance signal store from a board snapshot. */
export function createReleaseBoardState(initialState: ReleaseBoardSnapshot): ReleaseBoardState {
	return createStore(snapshot(createInitialReleaseBoardState(initialState)));
}

export function patchReleaseBoardState(state: ReleaseBoardState, nextState: Partial<ReleaseBoardSnapshot>): void {
	if (typeof nextState.filter !== 'undefined') {
		state.filter = nextState.filter;
	}

	if (typeof nextState.lastSyncAt !== 'undefined') {
		state.lastSyncAt = nextState.lastSyncAt;
	}

	if (typeof nextState.selectedTicketId !== 'undefined') {
		state.selectedTicketId = nextState.selectedTicketId;
	}

	if (typeof nextState.syncState !== 'undefined') {
		state.syncState = nextState.syncState;
	}

	if (typeof nextState.syncSummary !== 'undefined') {
		state.syncSummary = nextState.syncSummary;
	}

	if (typeof nextState.tickets !== 'undefined') {
		state.tickets = cloneReleaseBoardTickets(nextState.tickets);
	}

	ensureVisibleSelection(state);
}

export function createReleaseBoardStore(options: {
	state: ReleaseBoardState;
	syncReleaseBrief: () => Promise<ReleaseBoardSyncPayload>;
}): ReleaseBoardStore {
	const { state, syncReleaseBrief } = options;
	const visibleTickets = computed(() => resolveVisibleTickets(state.filter, state.tickets));
	const selectedTicket = computed(() => {
		const tickets = visibleTickets.get();
		return tickets.find((ticket) => ticket.id === state.selectedTicketId) ?? tickets[0] ?? null;
	});
	const blockedCount = computed(() => state.tickets.filter((ticket) => ticket.blocked).length);
	const launchReadyCount = computed(
		() => state.tickets.filter((ticket) => ticket.lane === 'Launch' && !ticket.blocked).length,
	);
	const isSyncing = computed(() => state.syncState === 'loading');
	const actions = createReleaseBoardActions(state, syncReleaseBrief);

	return {
		actions,
		state,
		views: {
			board: computed(() => ({
				blockedCount: blockedCount.get(),
				boardTone: resolveBoardTone(state.syncState, launchReadyCount.get()),
				filterLabel: formatFilter(state.filter),
				headline: createBoardHeadline(selectedTicket.get(), visibleTickets.get().length),
				laneBreakdown: createLaneBreakdown(state.tickets),
				visibleCount: visibleTickets.get().length,
			})),
			focus: computed(() => ({
				checklist: createSelectedChecklist(selectedTicket.get()),
				lastSyncAt: state.lastSyncAt,
				selectedTicketMeta: createSelectedTicketMeta(selectedTicket.get()),
				selectedTicketNotes:
					selectedTicket.get()?.notes ?? 'Everything currently visible is outside the active focus lane.',
				selectedTicketTitle: selectedTicket.get()?.title ?? 'No ticket selected',
				syncState: state.syncState,
				syncSummary: state.syncSummary,
			})),
			queue: computed(() => ({
				actions,
				canAdvanceSelected: visibleTickets.get().length > 0,
				canFocusNext: visibleTickets.get().length > 0,
				isSyncing: isSyncing.get(),
				syncButtonLabel: isSyncing.get() ? 'Syncing Nitro brief...' : 'Sync with Nitro brief',
				tickets: visibleTickets.get().map((ticket) => ({
					blockerLabel: ticket.blocked ? 'Clear blocker' : 'Flag blocker',
					blocked: ticket.blocked,
					focusLabel: ticket.id === selectedTicket.get()?.id ? 'Focused' : 'Focus',
					id: ticket.id,
					impact: ticket.impact,
					isSelected: ticket.id === selectedTicket.get()?.id,
					lane: ticket.lane,
					laneToken: toLaneToken(ticket.lane),
					notes: ticket.notes,
					owner: ticket.owner,
					title: ticket.title,
				})),
			})),
		},
	};
}

export function createEmptyReleaseBoardFocusView(): ReleaseBoardFocusView {
	return {
		checklist: ['Awaiting release board store.'],
		lastSyncAt: 'Not synced yet',
		selectedTicketMeta: 'Awaiting release board store.',
		selectedTicketNotes: 'Awaiting release board store.',
		selectedTicketTitle: 'Awaiting release board store.',
		syncState: 'idle',
		syncSummary: 'Awaiting release board store.',
	};
}

export function createEmptyReleaseBoardQueueView(): ReleaseBoardQueueView {
	const noop = () => {};

	return {
		actions: {
			advanceSelectedTicket: noop,
			cycleFilter: noop,
			focusNextTicket: noop,
			focusTicket: noop,
			syncWithNitro: noop,
			toggleBlocked: noop,
		},
		canAdvanceSelected: false,
		canFocusNext: false,
		isSyncing: false,
		syncButtonLabel: 'Sync with Nitro brief',
		tickets: [],
	};
}

export function resolveVisibleTickets(filter: ReleaseFilter, tickets: ReleaseStoryTicket[]): ReleaseStoryTicket[] {
	switch (filter) {
		case 'blocked':
			return tickets.filter((ticket) => ticket.blocked);
		case 'launch-ready':
			return tickets.filter((ticket) => ticket.lane === 'Launch' && !ticket.blocked);
		default:
			return tickets;
	}
}

function toLaneToken(lane: ReleaseLane): string {
	return lane.toLowerCase();
}

function formatFilter(filter: ReleaseFilter): string {
	switch (filter) {
		case 'blocked':
			return 'Blocked only';
		case 'launch-ready':
			return 'Launch-ready';
		default:
			return 'All tickets';
	}
}

function resolveBoardTone(syncState: ReleaseSyncState, launchReadyCount: number): ReleaseSyncState {
	if (syncState === 'loading' || syncState === 'error' || syncState === 'ready') {
		return syncState;
	}

	if (launchReadyCount > 0) {
		return 'ready';
	}

	return 'idle';
}

function createBoardHeadline(selectedTicket: ReleaseStoryTicket | null, visibleCount: number): string {
	if (!selectedTicket) {
		return 'No tickets match the current filter. Cycle the view to restore the full release board.';
	}

	return `${selectedTicket.title} is the current focus with ${visibleCount} visible tickets in the rehearsal queue.`;
}

function createLaneBreakdown(tickets: ReleaseStoryTicket[]): string {
	return laneSequence
		.map((lane) => `${lane}: ${tickets.filter((ticket) => ticket.lane === lane).length}`)
		.join(' · ');
}

function createSelectedTicketMeta(selectedTicket: ReleaseStoryTicket | null): string {
	if (!selectedTicket) {
		return 'Choose a different filter to repopulate the board.';
	}

	return `${selectedTicket.owner} · ${selectedTicket.lane} · ${selectedTicket.impact} impact · ETA ${selectedTicket.eta}`;
}

function createSelectedChecklist(selectedTicket: ReleaseStoryTicket | null): string[] {
	if (!selectedTicket) {
		return ['Restore a broader filter to continue the rehearsal.'];
	}

	return [
		`${selectedTicket.blocked ? 'Resolve' : 'Confirm'} dependency handoff for ${selectedTicket.owner}.`,
		`${selectedTicket.lane === 'Launch' ? 'Validate' : 'Prepare'} release evidence for the ${selectedTicket.lane.toLowerCase()} lane.`,
		`${selectedTicket.impact === 'High' ? 'Schedule leadership review.' : 'Share'} a concise rollout note with stakeholders.`,
	];
}

function cloneReleaseBoardTickets(tickets: ReleaseStoryTicket[]): ReleaseStoryTicket[] {
	return tickets.map((ticket) => ({ ...ticket }));
}

function createReleaseBoardActions(
	state: ReleaseBoardState,
	syncReleaseBrief: () => Promise<ReleaseBoardSyncPayload>,
): ReleaseBoardActions {
	return {
		advanceSelectedTicket: () => {
			const selectedTicket = state.tickets.find((ticket) => ticket.id === state.selectedTicketId);

			if (!selectedTicket) {
				return;
			}

			const nextTicketLane = nextLane(selectedTicket.lane);
			selectedTicket.blocked = false;
			selectedTicket.notes =
				selectedTicket.lane === 'Launch'
					? 'Ticket looped back to backlog for the next rehearsal pass.'
					: `Moved into ${nextTicketLane} with launch notes refreshed.`;
			selectedTicket.lane = nextTicketLane;
			ensureVisibleSelection(state);
		},
		cycleFilter: () => {
			state.filter = nextFilter(state.filter);
			ensureVisibleSelection(state);
		},
		focusNextTicket: () => {
			const visibleTickets = resolveVisibleTickets(state.filter, state.tickets);

			if (visibleTickets.length === 0) {
				return;
			}

			const currentIndex = visibleTickets.findIndex((ticket) => ticket.id === state.selectedTicketId);
			state.selectedTicketId =
				visibleTickets[(currentIndex + 1) % visibleTickets.length]?.id ?? visibleTickets[0].id;
		},
		focusTicket: (ticketId: number) => {
			state.selectedTicketId = ticketId;
		},
		syncWithNitro: async () => {
			if (state.syncState === 'loading') {
				return;
			}

			state.syncState = 'loading';
			state.syncSummary = 'Calling /api/hello to simulate a release-brief sync.';

			try {
				const payload = await syncReleaseBrief();
				const selectedTicket =
					state.tickets.find((ticket) => ticket.id === state.selectedTicketId) ?? state.tickets[0] ?? null;
				const launchReadyCount = state.tickets.filter(
					(ticket) => ticket.lane === 'Launch' && !ticket.blocked,
				).length;

				state.syncState = 'ready';
				state.syncSummary = `${payload.message} via ${payload.runtime}. ${selectedTicket?.title ?? 'Current focus'} now anchors ${launchReadyCount} launch-ready ticket${launchReadyCount === 1 ? '' : 's'}.`;
				state.lastSyncAt = payload.generatedAt;
			} catch (error) {
				state.syncState = 'error';
				state.syncSummary = error instanceof Error ? error.message : 'Unknown error';
				state.lastSyncAt = 'n/a';
			}
		},
		toggleBlocked: (ticketId: number) => {
			const ticket = state.tickets.find((entry) => entry.id === ticketId);

			if (!ticket) {
				return;
			}

			ticket.blocked = !ticket.blocked;
			ticket.notes = ticket.blocked
				? `${ticket.title} is waiting on a cross-team dependency before it can proceed.`
				: `${ticket.title} is unblocked and ready for the next handoff.`;
			ensureVisibleSelection(state);
		},
	};
}

function ensureVisibleSelection(state: ReleaseBoardState): void {
	const visibleTickets = resolveVisibleTickets(state.filter, state.tickets);

	if (visibleTickets.length === 0) {
		return;
	}

	if (visibleTickets.some((ticket) => ticket.id === state.selectedTicketId)) {
		return;
	}

	state.selectedTicketId = visibleTickets[0].id;
}
