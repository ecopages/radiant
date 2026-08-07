import { createContext } from '@ecopages/radiant/context';
import type { PlaygroundControl, PlaygroundScenario } from '@/lib/playground';

export type PlaygroundContextValue = {
	slug: string;
	scenarioId: string;
	props: Record<string, unknown>;
	children?: string;
	exportName: string;
	usageExample: string;
	controls: PlaygroundControl[];
	scenarios?: PlaygroundScenario[];
};

export const playgroundContext = createContext<PlaygroundContextValue>(
	Symbol.for('radiant-ui-docs-playground-context'),
);

export const emptyPlaygroundContext: PlaygroundContextValue = {
	slug: '',
	scenarioId: '',
	props: {},
	exportName: '',
	usageExample: '',
	controls: [],
};
