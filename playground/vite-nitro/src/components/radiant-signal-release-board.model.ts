import { computed, type Signal, type WritableSignal } from '@ecopages/signals';
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

export type ReleaseBoardState = {
	filter: WritableSignal<ReleaseFilter>;
	lastSyncAt: WritableSignal<string>;
	selectedTicketId: WritableSignal<number>;
	syncState: WritableSignal<ReleaseSyncState>;
	syncSummary: WritableSignal<string>;
	tickets: WritableSignal<ReleaseStoryTicket[]>;
};

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

export function nextLane(lane: ReleaseLane): ReleaseLane {
	return laneSequence[(laneSequence.indexOf(lane) + 1) % laneSequence.length] ?? 'Backlog';
}

export function nextFilter(filter: ReleaseFilter): ReleaseFilter {
	return filterSequence[(filterSequence.indexOf(filter) + 1) % filterSequence.length] ?? 'all';
}

export function createReleaseBoardStore(options: {
	actions: ReleaseBoardActions;
	state: ReleaseBoardState;
}): ReleaseBoardStore {
	const { actions, state } = options;
	const visibleTickets = computed(() => resolveVisibleTickets(state.filter.get(), state.tickets.get()));
	const selectedTicket = computed(() => {
		const tickets = visibleTickets.get();
		return tickets.find((ticket) => ticket.id === state.selectedTicketId.get()) ?? tickets[0] ?? null;
	});
	const blockedCount = computed(() => state.tickets.get().filter((ticket) => ticket.blocked).length);
	const launchReadyCount = computed(
		() => state.tickets.get().filter((ticket) => ticket.lane === 'Launch' && !ticket.blocked).length,
	);
	const isSyncing = computed(() => state.syncState.get() === 'loading');

	return {
		actions,
		state,
		views: {
			board: computed(() => ({
				blockedCount: blockedCount.get(),
				boardTone: resolveBoardTone(state.syncState.get(), launchReadyCount.get()),
				filterLabel: formatFilter(state.filter.get()),
				headline: createBoardHeadline(selectedTicket.get(), visibleTickets.get().length),
				laneBreakdown: createLaneBreakdown(state.tickets.get()),
				visibleCount: visibleTickets.get().length,
			})),
			focus: computed(() => ({
				checklist: createSelectedChecklist(selectedTicket.get()),
				lastSyncAt: state.lastSyncAt.get(),
				selectedTicketMeta: createSelectedTicketMeta(selectedTicket.get()),
				selectedTicketNotes:
					selectedTicket.get()?.notes ?? 'Everything currently visible is outside the active focus lane.',
				selectedTicketTitle: selectedTicket.get()?.title ?? 'No ticket selected',
				syncState: state.syncState.get(),
				syncSummary: state.syncSummary.get(),
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
