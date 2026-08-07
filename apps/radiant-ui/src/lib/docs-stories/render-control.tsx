import type { JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiButtonGroup } from '@ecopages/radiant-ui/button-group';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiSelect } from '@ecopages/radiant-ui/select';
import { RuiSwitch } from '@ecopages/radiant-ui/switch';
import type { DocsArgs, ResolvedDocsControl } from './types';

function controlShell(kind: ResolvedDocsControl['kind'], control: JsxRenderable): JsxRenderable {
	return <div class={`docs-story-controls__field docs-story-controls__field--${kind}`}>{control}</div>;
}

export function renderSegmentedControl(name: string, options: string[], value: string): JsxRenderable {
	return (
		<RuiButtonGroup class="docs-story-controls__segmented" aria-label={name}>
			{options.map((option) => (
				<RuiButton
					size="sm"
					variant="ghost"
					pressed={option === value}
					class="docs-story-controls__option"
					data-docs-arg={name}
					data-docs-arg-value={option}
				>
					{option}
				</RuiButton>
			))}
		</RuiButtonGroup>
	);
}

export function renderDocsControl(control: ResolvedDocsControl, args: DocsArgs): JsxRenderable {
	const raw = args[control.name];

	if (control.kind === 'boolean') {
		return controlShell(
			'boolean',
			<>
				<span class="docs-story-controls__label docs-story-controls__label--spacer" aria-hidden="true" />
				<RuiSwitch data-docs-arg={control.name} checked={Boolean(raw)}>
					{control.name}
				</RuiSwitch>
			</>,
		);
	}

	if (control.kind === 'segmented') {
		return controlShell(
			'segmented',
			<>
				<RuiLabel class="docs-story-controls__label">{control.name}</RuiLabel>
				{renderSegmentedControl(control.name, control.options, String(raw ?? ''))}
			</>,
		);
	}

	if (control.kind === 'select') {
		return controlShell(
			'select',
			<>
				<RuiLabel class="docs-story-controls__label">{control.name}</RuiLabel>
				<RuiSelect
					class="docs-story-controls__select"
					data-docs-arg={control.name}
					value={String(raw ?? '')}
					options={control.options.map((option) => ({ value: option, label: option }))}
				/>
			</>,
		);
	}

	return controlShell(
		'text',
		<>
			<RuiLabel class="docs-story-controls__label">{control.name}</RuiLabel>
			<RuiInput
				class="docs-story-controls__text"
				size="sm"
				type="text"
				data-docs-arg={control.name}
				value={String(raw ?? '')}
			/>
		</>,
	);
}

export function renderDocsControls(controls: ResolvedDocsControl[], args: DocsArgs): JsxRenderable {
	return (
		<div class="docs-story-controls__grid">{controls.map((control) => renderDocsControl(control, args))}</div>
	);
}
