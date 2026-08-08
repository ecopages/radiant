import { defineScenario } from './scenario';
import type { PlaygroundConfig, PlaygroundControl, PlaygroundScenario } from './types';

type LegacyPlaygroundInput = {
	controls: PlaygroundControl[];
	children?: string;
	scenarios?: PlaygroundScenario[];
};

/** Builds a playground config. Every component uses at least one scenario. */
export function definePlayground(input: PlaygroundConfig | LegacyPlaygroundInput): PlaygroundConfig {
	if ('scenarios' in input && input.scenarios && input.scenarios.length > 0) {
		return { scenarios: input.scenarios };
	}

	const legacy = input as LegacyPlaygroundInput;
	return {
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: legacy.controls,
				children: legacy.children,
			}),
		],
	};
}
