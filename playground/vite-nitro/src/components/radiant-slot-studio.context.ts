import { createContext } from '@ecopages/radiant/context';

export type RadiantSlotStudioContextValue = {
	commits: number;
	highlight: string;
	owner: string;
	stage: 'Build' | 'Review' | 'Ship';
	tempo: 'Calm' | 'Live' | 'Review';
};

export const radiantSlotStudioContext = createContext<RadiantSlotStudioContextValue>(Symbol('radiant-slot-studio'));
