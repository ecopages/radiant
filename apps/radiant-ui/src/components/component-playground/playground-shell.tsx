import type { JsxRenderable } from '@ecopages/jsx';
import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiSelect } from '@ecopages/radiant-ui/select';
import { RuiSwitch } from '@ecopages/radiant-ui/switch';
import type { ComponentDoc, PlaygroundControl } from '@/lib/playground';

export function renderPlaygroundControl(control: PlaygroundControl): JsxRenderable {
	if (control.kind === 'select') {
		return (
			<RuiField class="workbench__field" name={control.prop}>
				<RuiLabel>{control.label}</RuiLabel>
				<RuiSelect
					class="workbench__select"
					data-control={control.prop}
					value={control.defaultValue}
					options={control.options}
				/>
			</RuiField>
		);
	}

	if (control.kind === 'text') {
		return (
			<RuiField class="workbench__field" name={control.prop}>
				<RuiLabel>{control.label}</RuiLabel>
				<RuiInput
					class="workbench__control"
					size="sm"
					type="text"
					data-control={control.prop}
					value={control.defaultValue}
				/>
			</RuiField>
		);
	}

	if (control.kind === 'number') {
		return (
			<RuiField class="workbench__field" name={control.prop}>
				<RuiLabel>{control.label}</RuiLabel>
				<RuiInput
					class="workbench__control"
					size="sm"
					type="number"
					data-control={control.prop}
					value={String(control.defaultValue)}
					{...{
						min: control.min,
						max: control.max,
						step: control.step,
					}}
				/>
			</RuiField>
		);
	}

	return (
		<RuiField class="workbench__field workbench__field--boolean" name={control.prop}>
			<RuiSwitch data-control={control.prop} checked={control.defaultValue}>
				{control.label}
			</RuiSwitch>
		</RuiField>
	);
}

export type PlaygroundWorkbenchSlots = {
	doc: ComponentDoc;
	stage: JsxRenderable;
	code: JsxRenderable;
	controls: JsxRenderable;
	controlCount: number;
};

export function renderPlaygroundWorkbench({ doc, stage, code, controls, controlCount }: PlaygroundWorkbenchSlots): JsxRenderable {
	return (
		<section class="workbench" aria-label={`${doc.title} component playground`}>
			<div class="workbench__canvas">
				<div class="workbench__stage" aria-live="polite">
					{stage}
				</div>
				<aside class="workbench__controls" aria-label={`${doc.title} controls`}>
					<div class="workbench__controls-heading">
						<span>Controls</span>
						<span class="workbench__count">{controlCount}</span>
					</div>
					{controls}
				</aside>
			</div>
			{code}
		</section>
	);
}

export function renderPlaygroundCodePanel(source: string): JsxRenderable {
	return (
		<div class="workbench__code">
			<div class="workbench__tabs" role="tablist" aria-label="Source views">
				<button type="button" role="tab" aria-selected="true">
					Example
				</button>
				<button type="button" role="tab" aria-selected="false">
					Full usage
				</button>
			</div>
			<div class="workbench__code-body" role="tabpanel">
				<pre>
					<code>{source}</code>
				</pre>
				<button class="workbench__copy" type="button" aria-label="Copy visible source">
					Copy
				</button>
			</div>
		</div>
	);
}
