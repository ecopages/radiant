import { createContext } from '@ecopages/radiant';

export type RadiantContextFlowValue = {
	label: string;
	level: number;
};

export const radiantContextFlowContext = createContext<RadiantContextFlowValue>(Symbol('radiant-context-flow'));
