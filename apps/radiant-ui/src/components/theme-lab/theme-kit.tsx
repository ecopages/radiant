import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiAutocomplete, RuiAutocompleteCollection, RuiAutocompleteEmpty } from '@ecopages/radiant-ui/autocomplete';
import { RuiButton } from '@ecopages/radiant-ui/button';
import {
	RuiCombobox,
	RuiComboboxClear,
	RuiComboboxControl,
	RuiComboboxInput,
	RuiComboboxListbox,
	RuiComboboxTrigger,
} from '@ecopages/radiant-ui/combobox';
import { RuiField, RuiFieldDescription } from '@ecopages/radiant-ui/field';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiListbox } from '@ecopages/radiant-ui/listbox';
import { RuiCheckbox } from '@ecopages/radiant-ui/checkbox';
import { CodeTabs } from '@/components/code-tabs';
import { DefaultThemeTuner } from '@/components/default-theme-tuner/default-theme-tuner';
import { DOCS_FONT_ROLES, type DocsFontRole } from '@/lib/docs-fonts';
import { themeLabColorPresets, themeLabScaleSteps, themeLabScales } from '@/lib/theme-lab/color-presets';
import { highlightCssFigure } from '@/lib/theme-lab/highlight-css';
import { createThemeKit, createThemeKitInstallCommand, themeKitPackageManagers } from '@/lib/theme-lab/theme-kit';
import { DOCS_DEFAULT_THEME_TUNING } from '@/lib/docs-default-theme-tuning';
import './theme-kit.script';

const fontLabels: Record<DocsFontRole, string> = { sans: 'Body', heading: 'Headings', mono: 'Code' };

const initialKit = createThemeKit({ theme: 'rui-default', fonts: {}, tuning: DOCS_DEFAULT_THEME_TUNING });
const initialInstallTabs = themeKitPackageManagers.map((manager) => ({
	id: manager,
	label: manager,
	code: createThemeKitInstallCommand(manager, initialKit.packages),
}));
const initialCssTabs = [
	{ id: 'css', label: 'styles.css', html: await highlightCssFigure(initialKit.css), content: initialKit.css },
];

export const ThemeKit = eco.component<{}, JsxRenderable>({
	dependencies: {
		stylesheets: ['./theme-kit.css'],
		scripts: ['./theme-kit.script.tsx'],
		components: [DefaultThemeTuner, CodeTabs],
	},
	render: () => (
		<radiant-theme-kit class="theme-kit">
			<div class="theme-kit__col">
				<section class="theme-kit__step theme-kit__colors" aria-labelledby="theme-kit-colors">
					<h3 class="theme-kit__step-title" id="theme-kit-colors">
						Colors
					</h3>
					<div class="theme-kit__sub">
						<h4 class="theme-kit__subtitle">Start from a color</h4>
						<div class="theme-kit__color-row">
							<input type="color" data-kit-color="" aria-label="Primary color" value="#3b5bdb" />
							<code data-kit-color-hex="">#3b5bdb</code>
						</div>
						<ul class="theme-kit__presets" aria-label="Primary color presets">
							{themeLabColorPresets.map((preset) => (
								<li>
									<button
										type="button"
										class="theme-kit__preset"
										data-kit-preset={preset.hue}
										aria-label={`${preset.name}, hue ${preset.hue}`}
										title={preset.name}
										aria-pressed="false"
										style={`--preset: oklch(52% 0.19 ${preset.hue})`}
									/>
								</li>
							))}
						</ul>
					</div>
					<div class="theme-kit__sub">
						<h4 class="theme-kit__subtitle">Palette</h4>
						<RuiCheckbox data-kit-tint="">Tint the greys with the primary color</RuiCheckbox>
						<div class="theme-kit__scales" aria-label="Generated palette">
							{themeLabScales.map((scale) => (
								<div class="theme-kit__scale">
									<span class="theme-kit__scale-label">{scale.label}</span>
									<div class="theme-kit__scale-steps">
										{themeLabScaleSteps.map((step) => (
											<span
												style={`background: var(${scale.prefix}-${step})`}
												title={`${scale.label} ${step}`}
											/>
										))}
									</div>
								</div>
							))}
						</div>
					</div>
					<div class="theme-kit__sub theme-kit__tuner">
						<DefaultThemeTuner heading="Fine-tune" />
					</div>
				</section>
				<section class="theme-kit__step theme-kit__save-step" aria-labelledby="theme-kit-save">
					<h3 class="theme-kit__step-title" id="theme-kit-save">
						Save
					</h3>
					<form class="theme-kit__save" data-kit-save="">
						<RuiField name="theme-name">
							<RuiLabel class="sr-only">Theme name</RuiLabel>
							<RuiInput data-kit-name="" placeholder="Name this theme" maxlength={40} />
							<RuiFieldDescription class="sr-only">
								Saved themes stay in this browser and appear in the sidebar.
							</RuiFieldDescription>
						</RuiField>
						<RuiButton type="submit" variant="outline">
							Save
						</RuiButton>
					</form>
					<p class="theme-kit__note">Saved themes stay in this browser and appear in the sidebar.</p>
				</section>
			</div>
			<div class="theme-kit__col">
				<section class="theme-kit__step theme-kit__fonts" aria-labelledby="theme-kit-fonts">
					<h3 class="theme-kit__step-title" id="theme-kit-fonts">
						Fonts
					</h3>
					<div class="theme-kit__fields">
						{DOCS_FONT_ROLES.map((role) => (
							<div class="theme-kit__field">
								<span aria-hidden="true">{fontLabels[role]}</span>
								<RuiCombobox label={`${fontLabels[role]} font`} data-font-role={role}>
									<RuiComboboxControl>
										<RuiComboboxInput />
										<RuiComboboxClear />
										<RuiComboboxTrigger />
									</RuiComboboxControl>
									<RuiComboboxListbox>
										<RuiAutocomplete>
											<RuiAutocompleteCollection>
												<RuiListbox embedded label={`${fontLabels[role]} fonts`} />
												<RuiAutocompleteEmpty>No Fontsource font matches.</RuiAutocompleteEmpty>
											</RuiAutocompleteCollection>
										</RuiAutocomplete>
									</RuiComboboxListbox>
								</RuiCombobox>
							</div>
						))}
					</div>
					<p class="theme-kit__note" data-kit-font-hint="">
						Type to search every Fontsource font.
					</p>
				</section>
				<section class="theme-kit__output" aria-labelledby="theme-kit-output">
					<h3 class="theme-kit__step-title" id="theme-kit-output">
						Use it in your project
					</h3>
					<CodeTabs
						class="theme-kit__code theme-kit__code--install"
						label="Package managers"
						tabs={initialInstallTabs}
						copyLabel="Copy install command"
						defaultSelectedKey="pnpm"
					/>
					<CodeTabs
						class="theme-kit__code theme-kit__code--css"
						label="Stylesheet"
						tabs={initialCssTabs}
						copyLabel="Copy CSS"
						defaultSelectedKey="css"
					/>
					<div class="theme-kit__share">
						<RuiButton variant="outline" size="sm" data-kit-share="">
							Copy link to this theme
						</RuiButton>
						<p class="theme-kit__status" aria-live="polite" data-kit-status="" />
					</div>
					<script type="application/json" id="theme-spec" data-kit-spec="" />
					<p class="theme-kit__note">
						Fonts load from the Fontsource CDN here, so the preview needs a connection. Your project bundles
						them from npm instead.
					</p>
				</section>
			</div>
		</radiant-theme-kit>
	),
});
