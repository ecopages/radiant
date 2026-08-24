import type { JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiNumberField } from '@ecopages/radiant-ui/number-field';
import { RuiSelect } from '@ecopages/radiant-ui/select';
import { RuiSwitch } from '@ecopages/radiant-ui/switch';
import { RuiToolbar } from '@ecopages/radiant-ui/toolbar';
import type { DocsArgs, ResolvedDocsControl } from './types';

function controlShell(kind: ResolvedDocsControl['kind'], control: JsxRenderable): JsxRenderable {
	return <div class={`docs-story-controls__field docs-story-controls__field--${kind}`}>{control}</div>;
}

function toDocsNumberValue(raw: unknown): number {
	const value = typeof raw === 'number' ? raw : Number(raw);
	return Number.isFinite(value) ? value : 0;
}

/**
 * Number controls for static SSR docs markup.
 *
 * @remarks
 * Plain `value={n}` on the `RuiNumberField` view is a server property binding and is
 * omitted from HTML. Docs controls are not JSX-hydrated, so the client would upgrade
 * with `value === undefined` and steppers would snap to 0. The CE host accepts
 * `attr:value`, which keeps the number in the serialized host attribute.
 */
function renderNumberControl(name: string, raw: unknown): JsxRenderable {
	return (
		<>
			<RuiLabel class="docs-story-controls__label">{name}</RuiLabel>
			<RuiNumberField
				class="docs-story-controls__number"
				data-docs-arg={name}
				attr:value={toDocsNumberValue(raw)}
			/>
		</>
	);
}

export function renderSegmentedControl(name: string, options: string[], value: string): JsxRenderable {
	return (
		<RuiToolbar class="docs-story-controls__segmented" label={name}>
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
		</RuiToolbar>
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

	if (control.kind === 'number') {
		return controlShell('number', renderNumberControl(control.name, raw));
	}

	return controlShell(
		'text',
		<>
			<RuiLabel class="docs-story-controls__label">{control.name}</RuiLabel>
			<RuiInput
				class="docs-story-controls__text"
				type="text"
				data-docs-arg={control.name}
				value={String(raw ?? '')}
			/>
		</>,
	);
}

export function renderDocsControls(controls: ResolvedDocsControl[], args: DocsArgs): JsxRenderable {
	return <div class="docs-story-controls__grid">{controls.map((control) => renderDocsControl(control, args))}</div>;
}
