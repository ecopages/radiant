import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';
import { RuiButton } from '@ecopages/radiant-ui/button';
import {
	applyDefaultThemeTuning,
	createDocsDefaultThemeTuningCss,
	DOCS_DEFAULT_THEME_TUNING,
	DOCS_DEFAULT_TUNING_SCHEMA,
	DOCS_DEFAULT_TUNING_STORAGE_KEY,
	parseDocsDefaultThemeTuning,
	readDocsDefaultThemeTuning,
	type DocsDefaultThemeTuning,
} from '@/lib/docs-theme-preview';

const tuningControls = (Object.keys(DOCS_DEFAULT_TUNING_SCHEMA) as (keyof DocsDefaultThemeTuning)[]).map((key) => ({
	key,
	...DOCS_DEFAULT_TUNING_SCHEMA[key],
}));

function persistTuning(tuning: DocsDefaultThemeTuning): void {
	try {
		localStorage.setItem(DOCS_DEFAULT_TUNING_STORAGE_KEY, JSON.stringify(tuning));
	} catch {}
}

/** Docs-only controls for exploring the Radiant Default seed and geometry inputs. */
@customElement('radiant-default-theme-tuner')
export class DefaultThemeTunerElement extends RadiantElement {
	private tuning = readDocsDefaultThemeTuning();
	private rootObserver: MutationObserver | null = null;
	private copyStatus = '';

	override connectedCallback(): void {
		super.connectedCallback();
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
		this.requestUpdate();
	}

	override disconnectedCallback(): void {
		this.rootObserver?.disconnect();
		this.rootObserver = null;
		super.disconnectedCallback();
	}

	@onEvent({ selector: 'input[data-default-tuning]', type: 'input' })
	onTuningInput(event: Event): void {
		const input = event.target;
		if (!(input instanceof HTMLInputElement)) return;
		const key = input.dataset.defaultTuning as keyof DocsDefaultThemeTuning | undefined;
		if (!key || !tuningControls.some((control) => control.key === key)) return;

		this.tuning = parseDocsDefaultThemeTuning({ ...this.tuning, [key]: Number(input.value) });
		persistTuning(this.tuning);
		const root = typeof document === 'undefined' ? null : document.documentElement;
		if (root?.dataset.ruiTheme === 'rui-default') {
			applyDefaultThemeTuning(root, this.tuning);
		}
		this.requestUpdate();
	}

	@onEvent({ selector: 'button[data-reset-default-tuning]', type: 'click' })
	onResetTuning(): void {
		this.tuning = DOCS_DEFAULT_THEME_TUNING;
		persistTuning(this.tuning);
		const root = typeof document === 'undefined' ? null : document.documentElement;
		if (root?.dataset.ruiTheme === 'rui-default') {
			applyDefaultThemeTuning(root, this.tuning);
		}
		this.copyStatus = 'Radiant Default values restored.';
		this.requestUpdate();
	}

	@onEvent({ selector: 'button[data-copy-default-tuning]', type: 'click' })
	async onCopyTuning(): Promise<void> {
		try {
			await navigator.clipboard.writeText(createDocsDefaultThemeTuningCss(this.tuning));
			this.copyStatus = 'Radiant Default CSS copied.';
		} catch {
			this.copyStatus = 'Copy unavailable. Select the CSS below to copy it manually.';
		}
		this.requestUpdate();
	}

	override render() {
		const isDefaultTheme =
			typeof document === 'undefined' || document.documentElement?.dataset.ruiTheme === 'rui-default';
		return (
			<section class="default-theme-tuner" aria-labelledby="default-theme-tuner-title">
				<div class="default-theme-tuner__intro">
					<div>
						<p class="default-theme-tuner__eyebrow">Radiant Default</p>
						<h2 id="default-theme-tuner-title">Tune six inputs, reshape the whole palette</h2>
						<p>
							OKLCH derives each color scale from three seed hues; three geometry values adjust density,
							corners, and borders.
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
						<label class="default-theme-tuner__control" for={`default-tune-${control.key}`}>
							<span class="default-theme-tuner__control-heading">
								<span>{control.label}</span>
								<output for={`default-tune-${control.key}`}>
									{this.tuning[control.key]}
									{control.unit}
								</output>
							</span>
							<input
								id={`default-tune-${control.key}`}
								type="range"
								data-default-tuning={control.key}
								min={control.min}
								max={control.max}
								step={control.step}
								value={this.tuning[control.key]}
								aria-describedby="default-theme-tuner-note"
								disabled={!isDefaultTheme}
							/>
						</label>
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

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'radiant-default-theme-tuner': JsxCustomElementAttributes<DefaultThemeTunerElement>;
	}
}
