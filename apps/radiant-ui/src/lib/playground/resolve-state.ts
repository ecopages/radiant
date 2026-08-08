import type { ComponentDoc, PlaygroundControl, ResolvedPlaygroundState } from './types';

export function defaultPropsFromControls(controls: PlaygroundControl[]): Record<string, unknown> {
	const props: Record<string, unknown> = {};
	for (const control of controls) {
		props[control.prop] = control.defaultValue;
	}
	return props;
}

export function resolvePlaygroundState(doc: ComponentDoc, scenarioId?: string): ResolvedPlaygroundState {
	const scenarios = doc.playground.scenarios;
	const active = scenarios.find((scenario) => scenario.id === scenarioId) ?? scenarios[0];
	const controls = active.controls ?? [];
	const controlProps = defaultPropsFromControls(controls);

	return {
		scenarioId: active.id,
		controls,
		props: { ...active.props, ...controlProps },
		children: active.children,
	};
}
