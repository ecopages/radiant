import { createStore, state } from '@ecopages/signals';

export type SignalLabLane = 'Backlog' | 'Review' | 'Launch';

export type SignalLabTicket = {
	id: string;
	lane: SignalLabLane;
	title: string;
};

const laneSequence: SignalLabLane[] = ['Backlog', 'Review', 'Launch'];

const initialTickets: SignalLabTicket[] = [
	{ id: 'alpha', lane: 'Review', title: 'Alpha handoff' },
	{ id: 'beta', lane: 'Backlog', title: 'Beta migration' },
	{ id: 'gamma', lane: 'Launch', title: 'Gamma launch' },
];

export const sharedSignalMeterCount = state(2);

export const signalLabStore = createStore({
	focusedIndex: 0,
	syncOnline: true,
	tickets: initialTickets.map((ticket) => ({ ...ticket })),
});

export function advanceFocusedSignalLabTicket(): void {
	const focusedTicket = signalLabStore.tickets[signalLabStore.focusedIndex];

	if (!focusedTicket) {
		return;
	}

	focusedTicket.lane =
		laneSequence[(laneSequence.indexOf(focusedTicket.lane) + 1) % laneSequence.length] ?? 'Backlog';
}

export function focusNextSignalLabTicket(): void {
	if (signalLabStore.tickets.length === 0) {
		return;
	}

	signalLabStore.focusedIndex = (signalLabStore.focusedIndex + 1) % signalLabStore.tickets.length;
}

export function toggleSignalLabSync(): void {
	signalLabStore.syncOnline = !signalLabStore.syncOnline;
}
