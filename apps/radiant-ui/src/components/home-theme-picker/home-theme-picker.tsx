import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiSelect } from '@ecopages/radiant-ui/select';
import {
	defaultDocsThemeSelection,
	docsThemeColorOptions,
	docsThemeRadiusOptions,
	docsThemeSpacingOptions,
} from '@/lib/docs-theme-preview';
import './home-theme-picker.script';

function selectOptions(options: readonly { value: string; label: string }[]) {
	return options.map(({ value, label }) => ({ value, label }));
}

export const HomeThemePicker = eco.component<{}, JsxRenderable>({
	dependencies: {
		stylesheets: ['./home-theme-picker.css'],
		scripts: ['./home-theme-picker.script.tsx'],
	},
	render: () => (
		<radiant-home-theme-picker>
			<div class="home-theme-picker">
				<div class="home-theme-picker__groups">
					<div class="home-theme-picker__group">
						<p class="home-theme-picker__label" aria-hidden="true">
							Colour
						</p>
						<RuiSelect
							value={defaultDocsThemeSelection.colors}
							label="Colour"
							data-token="colors"
							options={selectOptions(docsThemeColorOptions)}
						/>
					</div>
					<div class="home-theme-picker__group">
						<p class="home-theme-picker__label" aria-hidden="true">
							Spacing
						</p>
						<RuiSelect
							value={defaultDocsThemeSelection.spacing}
							label="Spacing"
							data-token="spacing"
							options={selectOptions(docsThemeSpacingOptions)}
						/>
					</div>
					<div class="home-theme-picker__group">
						<p class="home-theme-picker__label" aria-hidden="true">
							Shape
						</p>
						<RuiSelect
							value={defaultDocsThemeSelection.radius}
							label="Shape"
							data-token="radius"
							options={selectOptions(docsThemeRadiusOptions)}
						/>
					</div>
				</div>
				<p class="home-theme-picker__note">
					Documentation preview — not an application API. See{' '}
					<a href="/docs/getting-started/theming">Theming</a>.
				</p>
			</div>
		</radiant-home-theme-picker>
	),
});
