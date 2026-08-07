import type { JsxCustomElementAttributes, JsxRenderable } from '@ecopages/jsx';
import { RadiantElement, customElement } from '@ecopages/radiant';
import { contextSelector } from '@ecopages/radiant/context';
import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiSelect } from '@ecopages/radiant-ui/select';
import type { PlaygroundControl } from '@/lib/playground';
import { renderPlaygroundControl } from './playground-shell';
import { emptyPlaygroundContext, playgroundContext, type PlaygroundContextValue } from './playground-context';

/**
 * Reactive controls panel for the docs playground.
 *
 * @remarks
 * Subscribes to playground context so scenario switches update the control set
 * without remounting the preview stage.
 */
@customElement('radiant-playground-controls')
export class PlaygroundControlsElement extends RadiantElement {
	@contextSelector({ context: playgroundContext })
	playground: PlaygroundContextValue = emptyPlaygroundContext;

	override render() {
		const { controls, scenarios, scenarioId } = this.playground;
		const scenarioOptions = scenarios?.map((scenario) => ({
			value: scenario.id,
			label: scenario.label,
		}));

		return (
			<>
				{scenarioOptions && scenarioOptions.length > 1 ? (
					<RuiField class="workbench__field" name="scenario">
						<RuiLabel>Example</RuiLabel>
						<RuiSelect
							class="workbench__select"
							data-scenario=""
							value={scenarioId}
							options={scenarioOptions}
						/>
					</RuiField>
				) : null}
				{controls.map((control: PlaygroundControl) => renderPlaygroundControl(control))}
			</>
		);
	}
}

declare module '@ecopages/jsx' {
	interface JsxCustomIntrinsicElements {
		'radiant-playground-controls': JsxCustomElementAttributes<PlaygroundControlsElement>;
	}
}

export function renderPlaygroundControlsStatic(
	scenarios: PlaygroundContextValue['scenarios'],
	scenarioId: string,
	controls: PlaygroundControl[],
): JsxRenderable {
	const scenarioOptions = scenarios?.map((scenario) => ({
		value: scenario.id,
		label: scenario.label,
	}));

	return (
		<>
			{scenarioOptions && scenarioOptions.length > 1 ? (
				<RuiField class="workbench__field" name="scenario">
					<RuiLabel>Example</RuiLabel>
					<RuiSelect
						class="workbench__select"
						data-scenario=""
						value={scenarioId}
						options={scenarioOptions}
					/>
				</RuiField>
			) : null}
			{controls.map((control) => renderPlaygroundControl(control))}
		</>
	);
}
