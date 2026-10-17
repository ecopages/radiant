import { RuiListbox, RuiListboxOption, RuiListboxOptionIndicator } from '@ecopages/radiant-ui/listbox';
import {
	RuiSelect,
	RuiSelectControl,
	RuiSelectListbox,
	RuiSelectTrigger,
	RuiSelectValue,
} from '@ecopages/radiant-ui/select';
import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { defaultDocsThemeSelection, docsThemeColorOptions } from '@/lib/docs-theme-preview';
import './theme-palette-picker.script';

export const ThemePalettePicker = eco.component<{}, JsxRenderable>({
	dependencies: {
		stylesheets: ['./theme-palette-picker.css'],
		scripts: ['./theme-palette-picker.script.tsx'],
	},
	render: () => (
		<radiant-theme-palette-picker>
			<RuiSelect
				class="theme-picker"
				label="Choose a color theme"
				value={[defaultDocsThemeSelection.colors]}
				data-theme-picker
			>
				<RuiSelectControl class="theme-picker__control">
					<RuiSelectTrigger class="theme-picker__trigger" title="Choose a color theme">
						<svg
							viewBox="0 0 24 24"
							width="20"
							height="20"
							fill="none"
							stroke="currentColor"
							stroke-width="1.7"
							aria-hidden="true"
						>
							<path d="M12 3.5a8.5 8.5 0 1 0 0 17h1.2a2.3 2.3 0 0 0 1.7-3.9 1.5 1.5 0 0 1 1.1-2.6h1.1a3.4 3.4 0 0 0 3.4-3.4A8.5 8.5 0 0 0 12 3.5Z" />
							<circle cx="7.7" cy="11.5" r="1" fill="currentColor" />
							<circle cx="9.8" cy="7.8" r="1" fill="currentColor" />
							<circle cx="14.2" cy="7.6" r="1" fill="currentColor" />
							<circle cx="17" cy="10.5" r="1" fill="currentColor" />
						</svg>
						<RuiSelectValue class="theme-picker__value theme-picker__sr-only" />
					</RuiSelectTrigger>
				</RuiSelectControl>
				<RuiSelectListbox class="theme-picker__menu">
					<p class="theme-picker__menu-heading">Documentation theme</p>
					<RuiListbox embedded label="Documentation theme">
						{docsThemeColorOptions.map((option) => (
							<RuiListboxOption class="theme-picker__option" value={option.value} label={option.label}>
								<span
									class="theme-picker__swatch"
									data-theme-swatch={option.value}
									aria-hidden="true"
								/>
								<span class="theme-picker__option-copy">
									<span class="theme-picker__option-label">{option.label}</span>
									<span class="theme-picker__option-description">{option.description}</span>
								</span>
								<RuiListboxOptionIndicator />
							</RuiListboxOption>
						))}
					</RuiListbox>
					<p class="theme-picker__note">
						Preview only. See <a href="/docs/getting-started/theming">Theming</a>.
					</p>
				</RuiSelectListbox>
			</RuiSelect>
		</radiant-theme-palette-picker>
	),
});
