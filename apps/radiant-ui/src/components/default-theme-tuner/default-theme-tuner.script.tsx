import type { JSX_PROPS } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent, prop, state } from '@ecopages/radiant';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiField, RuiFieldDescription } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiSlider, type RuiSliderChangeDetail } from '@ecopages/radiant-ui/slider';
import {
	applyDefaultThemeTuning,
	createDocsDefaultThemeTuningCss,
	DOCS_DEFAULT_THEME_TUNING,
	DOCS_DEFAULT_TUNING_SCHEMA,
	DOCS_TUNING_CHANGE_EVENT,
	formatTuningValue,
	tuningValueDigits,
	parseDocsDefaultThemeTuning,
	type DocsDefaultThemeTuning,
} from '@/lib/docs-default-theme-tuning';
import { readDocsDefaultThemeTuning, writeDocsDefaultThemeTuning } from '@/lib/docs-theme-preview';

const tuningControls = (Object.keys(DOCS_DEFAULT_TUNING_SCHEMA) as (keyof DocsDefaultThemeTuning)[]).map((key) => ({
	key,
	...DOCS_DEFAULT_TUNING_SCHEMA[key],
}));

/** Docs-only controls for exploring the Radiant Default seed and geometry inputs. */
@customElement('radiant-default-theme-tuner')
export class DefaultThemeTunerElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: { heading?: string };
	@prop({ type: String }) heading = 'Tune a few inputs, reshape the whole palette';
	@state private tuning = readDocsDefaultThemeTuning();
	private rootObserver: MutationObserver | null = null;
	private persistenceTimeout: ReturnType<typeof setTimeout> | null = null;
	@state private copyStatus = '';

	private readonly onExternalTuning = (event: Event): void => {
		const tuning = parseDocsDefaultThemeTuning((event as CustomEvent<unknown>).detail);
		if (JSON.stringify(tuning) !== JSON.stringify(this.tuning)) this.tuning = tuning;
	};

	override connectedCallback(): void {
		super.connectedCallback();
		document.addEventListener(DOCS_TUNING_CHANGE_EVENT, this.onExternalTuning);
		this.tuning = readDocsDefaultThemeTuning();
		const root = typeof document === 'undefined' ? null : document.documentElement;
		if (root?.dataset.ruiTheme === 'rui-default') {
			applyDefaultThemeTuning(root, this.tuning);
		}
		if (root && typeof MutationObserver !== 'undefined') {
			this.rootObserver = new MutationObserver(() => this.requestUpdate());
			this.rootObserver.observe(root, {
				attributes: true,
				attributeFilter: ['data-rui-theme'],
			});
		}
	}

	override disconnectedCallback(): void {
		document.removeEventListener(DOCS_TUNING_CHANGE_EVENT, this.onExternalTuning);
		this.rootObserver?.disconnect();
		this.rootObserver = null;
		if (this.persistenceTimeout !== null) {
			clearTimeout(this.persistenceTimeout);
			this.persistenceTimeout = null;
			writeDocsDefaultThemeTuning(this.tuning);
		}
		super.disconnectedCallback();
	}

	private announceTuning(): void {
		document.dispatchEvent(new CustomEvent(DOCS_TUNING_CHANGE_EVENT, { detail: this.tuning }));
	}

	private schedulePersistence(): void {
		if (this.persistenceTimeout !== null) clearTimeout(this.persistenceTimeout);
		this.persistenceTimeout = setTimeout(() => {
			this.persistenceTimeout = null;
			writeDocsDefaultThemeTuning(this.tuning);
		}, 150);
	}

	@onEvent({ selector: 'rui-slider[data-default-tuning]', type: 'rui-change' })
	onTuningChange(event: CustomEvent<RuiSliderChangeDetail>): void {
		const slider = event.target;
		if (!(slider instanceof HTMLElement)) return;
		const key = slider.dataset.defaultTuning as keyof DocsDefaultThemeTuning | undefined;
		const [value] = event.detail.value;
		if (!key || !tuningControls.some((control) => control.key === key) || !Number.isFinite(value)) return;

		this.tuning = parseDocsDefaultThemeTuning({ ...this.tuning, [key]: value });
		this.announceTuning();
		this.schedulePersistence();
		const root = typeof document === 'undefined' ? null : document.documentElement;
		if (root?.dataset.ruiTheme === 'rui-default') {
			applyDefaultThemeTuning(root, this.tuning);
		}
	}

	@onEvent({ selector: 'button[data-reset-default-tuning]', type: 'click' })
	onResetTuning(): void {
		if (this.persistenceTimeout !== null) {
			clearTimeout(this.persistenceTimeout);
			this.persistenceTimeout = null;
		}
		this.tuning = DOCS_DEFAULT_THEME_TUNING;
		this.announceTuning();
		writeDocsDefaultThemeTuning(this.tuning);
		const root = typeof document === 'undefined' ? null : document.documentElement;
		if (root?.dataset.ruiTheme === 'rui-default') {
			applyDefaultThemeTuning(root, this.tuning);
		}
		this.copyStatus = 'Radiant Default values restored.';
	}

	@onEvent({ selector: 'button[data-copy-default-tuning]', type: 'click' })
	async onCopyTuning(): Promise<void> {
		try {
			await navigator.clipboard.writeText(createDocsDefaultThemeTuningCss(this.tuning));
			this.copyStatus = 'Radiant Default CSS copied.';
		} catch {
			this.copyStatus = 'Copy unavailable. Select the CSS below to copy it manually.';
		}
	}

	override render() {
		const isDefaultTheme =
			typeof document === 'undefined' || document.documentElement?.dataset.ruiTheme === 'rui-default';
		return (
			<section class="default-theme-tuner" aria-labelledby="default-theme-tuner-title">
				<div class="default-theme-tuner__intro">
					<div>
						<p class="default-theme-tuner__eyebrow">Radiant Default</p>
						<h2 id="default-theme-tuner-title">{this.heading}</h2>
						<p>
							OKLCH derives each color scale from the primary and neutral hues, with secondary offset from
							primary; three geometry values adjust density, corners, and borders.
						</p>
					</div>
					<RuiButton variant="outline" size="sm" data-reset-default-tuning>
						Reset
					</RuiButton>
				</div>
				<p class="default-theme-tuner__note" id="default-theme-tuner-note">
					{isDefaultTheme
						? 'These controls only affect Radiant Default. Every Radiant Theme keeps its own typography, spacing, and component shape.'
						: 'Select Radiant Default in the theme menu to explore these controls.'}
				</p>
				<div class="default-theme-tuner__controls">
					{tuningControls.map((control) => (
						<div class="default-theme-tuner__control">
							<RuiField name={control.key}>
								<span class="default-theme-tuner__control-heading">
									<RuiLabel>{control.label}</RuiLabel>
									<output data-default-tuning-value={control.key}>
										{formatTuningValue(control.key, this.tuning[control.key])}
									</output>
								</span>
								<RuiSlider
									data-default-tuning={control.key}
									valuePrecision={tuningValueDigits(control.key)}
									min={control.min}
									max={control.max}
									step={control.step}
									value={this.tuning[control.key]}
									disabled={!isDefaultTheme}
								/>
								<RuiFieldDescription class="sr-only">
									{isDefaultTheme
										? 'Changes Radiant Default in the preview and updates the generated CSS.'
										: 'Select Radiant Default to adjust this value.'}
								</RuiFieldDescription>
							</RuiField>
						</div>
					))}
				</div>
				<pre class="default-theme-tuner__css">
					<code>{createDocsDefaultThemeTuningCss(this.tuning)}</code>
				</pre>
				<div class="default-theme-tuner__actions">
					<RuiButton variant="outline" size="sm" data-copy-default-tuning>
						Copy CSS
					</RuiButton>
					<p class="default-theme-tuner__status" aria-live="polite">
						{this.copyStatus}
					</p>
				</div>
			</section>
		);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'radiant-default-theme-tuner': DefaultThemeTunerElement;
	}
}
