import { createContext } from '@ecopages/radiant';
import type { ReleaseBoardStore } from './radiant-signal-release-board.model.ts';

export type ReleaseLane = 'Backlog' | 'Build' | 'Review' | 'Launch';
export type ReleaseFilter = 'all' | 'blocked' | 'launch-ready';
export type ReleaseImpact = 'Low' | 'Medium' | 'High';
export type ReleaseSyncState = 'idle' | 'loading' | 'ready' | 'error';

export type ReleaseStoryTicket = {
	id: number;
	title: string;
	owner: string;
	lane: ReleaseLane;
	blocked: boolean;
	eta: string;
	impact: ReleaseImpact;
	notes: string;
};

export type ReleaseBoardTicketView = {
	id: number;
	title: string;
	owner: string;
	lane: ReleaseLane;
	laneToken: string;
	blocked: boolean;
	impact: ReleaseImpact;
	notes: string;
	isSelected: boolean;
	focusLabel: string;
	blockerLabel: string;
};

export type ReleaseBoardActions = {
	advanceSelectedTicket: () => void;
	cycleFilter: () => void;
	focusNextTicket: () => void;
	focusTicket: (ticketId: number) => void;
	syncWithNitro: () => void | Promise<void>;
	toggleBlocked: (ticketId: number) => void;
};

export type ReleaseBoardContextValue = {
	store: ReleaseBoardStore;
};

export const radiantSignalReleaseBoardContext = createContext<ReleaseBoardContextValue>(
	Symbol('radiant-signal-release-board-context'),
);
