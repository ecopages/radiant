import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiListbox, RuiListboxOption } from '@ecopages/radiant-ui/listbox';
import { defaultDocsThemeSelection, docsThemeColorOptions } from '@/lib/docs-theme-preview';
import './theme-lab-picker.script';

export const ThemeLabPicker = eco.component<{}, JsxRenderable>({
	dependencies: {
		stylesheets: ['./theme-lab-picker.css'],
		scripts: ['./theme-lab-picker.script.tsx'],
	},
	render: () => (
		<radiant-theme-lab-picker class="theme-lab-picker">
			<RuiListbox
				class="theme-lab-picker__builtins"
				label="Themes"
				value={[defaultDocsThemeSelection.colors]}
				bordered={false}
				data-theme-list=""
			>
				{docsThemeColorOptions.map((option) => (
					<RuiListboxOption class="theme-lab-picker__option" value={option.value} label={option.label}>
						<span class="theme-lab-picker__swatch" data-theme-swatch={option.value} aria-hidden="true" />
						<span class="theme-lab-picker__copy">
							<span class="theme-lab-picker__label">{option.label}</span>
							<span class="theme-lab-picker__description">{option.description}</span>
						</span>
					</RuiListboxOption>
				))}
			</RuiListbox>
			<div class="theme-lab-picker__saved" data-saved-section="" hidden>
				<p class="theme-lab-picker__heading">Your themes</p>
				<ul class="theme-lab-picker__list" data-saved-list="" aria-label="Your themes" />
			</div>
			<div class="theme-lab-picker__reset" data-reset-section="" hidden>
				<button type="button" class="theme-lab-picker__reset-button" data-reset-appearance="">
					Reset all pages to Radiant Default
				</button>
				<p>Your theme applies to every docs page until you reset it.</p>
			</div>
		</radiant-theme-lab-picker>
	),
});
