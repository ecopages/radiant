import type { JsxCustomElementAttributes, SubscribableJsxValue } from '@ecopages/jsx';
import { RadiantElement, customElement, prop, state } from '@ecopages/radiant';
import { THEME_CONFIG, type ConfigValue, type ThemeKey } from './radiant-binding-map-lab.templates';

type RadiantBindingMapLabBindings = {
	config: ConfigValue;
	preference: ThemeKey;
};

@customElement('radiant-binding-map-lab')
export class RadiantBindingMapLab extends RadiantElement<RadiantBindingMapLabBindings> {
	@state preference: ThemeKey = 'light';
	@prop({ type: Object, defaultValue: { label: 'Hello' } }) config: ConfigValue = { label: 'Hello' };

	private readonly themeLabel = this.$.preference.map((preference) => THEME_CONFIG[preference].label);
	private readonly themeIcon = this.$.preference.map((preference) => THEME_CONFIG[preference].icon);
	private readonly configLabelViaMap = this.$.config.map((config) => (config as unknown as ConfigValue).label);

	private readonly togglePreference = () => {
		this.preference = this.preference === 'light' ? 'dark' : 'light';
	};

	private readonly replaceConfig = () => {
		const nextLabel = this.config.label === 'Hello' ? 'Next' : 'Hello';
		this.config = { label: nextLabel };
	};

	override render() {
		return (
			<section class="component-card component-card--bindings">
				<p class="component-tag">Derived bindings</p>
				<h3>Binding map lab</h3>
				<p class="component-copy">
					Hoist <code>map</code> transforms to field initializers. Member access for object keys can be
					written inline in <code>render()</code> — the runtime caches each key on the binding.
				</p>
				<div class="binding-lab__layout">
					<section class="binding-lab__lane">
						<p class="component-meta">Record lookup via map</p>
						<p class="component-metric" data-ref="binding-theme-label">
							Theme label: {this.themeLabel}
						</p>
						<p class="component-copy" data-ref="binding-theme-icon">
							Theme icon: {this.themeIcon}
						</p>
						<p class="component-copy">
							Source: <code>this.$.preference.map((p) =&gt; THEME_CONFIG[p].label)</code>
						</p>
						<button type="button" on:click={this.togglePreference}>
							Toggle preference
						</button>
					</section>
					<section class="binding-lab__lane">
						<p class="component-meta">Object prop projection</p>
						<p class="component-metric" data-ref="binding-config-map">
							Config (map): {this.configLabelViaMap}
						</p>
						<p class="component-metric" data-ref="binding-config-member">
							Config (member):{' '}
							{(this.$.config as unknown as { label: SubscribableJsxValue<string> }).label}
						</p>
						<p class="component-copy">
							Inline member access — equivalent to <code>map</code>, memoized per key.
						</p>
						<button type="button" on:click={this.replaceConfig}>
							Replace config object
						</button>
					</section>
				</div>
			</section>
		);
	}
}

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'radiant-binding-map-lab': JsxCustomElementAttributes<HTMLElement, Record<never, never>>;
	}
}
