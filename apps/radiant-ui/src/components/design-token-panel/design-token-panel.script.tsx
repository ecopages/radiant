import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';
import { RuiHeading, RuiHeadingDescription, RuiHeadingEyebrow, RuiHeadingTitle } from '@ecopages/radiant-ui/heading';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiRadio, RuiRadioGroup, RuiRadioGroupControl } from '@ecopages/radiant-ui/radio-group';

type TokenName = 'colors' | 'spacing' | 'radius';
type TokenSelection = Record<TokenName, string>;

const LEGACY_STORAGE_KEY = 'radiant-ui-docs:design-tokens';
const OVERRIDE_STYLE_ID = 'radiant-ui-docs-token-overrides';
const defaultSelection: TokenSelection = { colors: 'default', spacing: 'default', radius: 'default' };

const colorOptions = [
	{ value: 'default', label: 'Default', description: 'Glacier alias' },
	{ value: 'glacier', label: 'Glacier', description: 'Cool, editorial' },
	{ value: 'basalt', label: 'Basalt', description: 'Carbon-inspired' },
	{ value: 'ember', label: 'Ember', description: 'Warm accent' },
] as const;

const spacingOptions = [
	{ value: 'default', label: 'Default', description: 'Comfortable rhythm' },
	{ value: 'compact', label: 'Compact', description: 'Dense controls' },
	{ value: 'wide', label: 'Wide', description: 'Generous rhythm' },
] as const;

const radiusOptions = [
	{ value: 'default', label: 'Default', description: 'Subtle rounding' },
	{ value: 'soft', label: 'Soft', description: 'Generous rounding' },
	{ value: 'sharp', label: 'Sharp', description: 'Square surfaces' },
] as const;

const docsTokenOverrides = `
html {
	--color-primary: var(--primary);
	--color-on-primary: var(--on-primary);
	--color-primary-container: var(--primary-container);
	--color-on-primary-container: var(--on-primary-container);
	--color-secondary: var(--secondary);
	--color-on-secondary: var(--on-secondary);
	--color-secondary-container: var(--secondary-container);
	--color-on-secondary-container: var(--on-secondary-container);
	--color-background: var(--background);
	--color-on-background: var(--on-background);
	--color-background-accent: var(--surface);
	--color-on-background-accent: var(--on-surface);
	--color-muted: var(--surface-container-low);
	--color-border: var(--border);
	--color-link: var(--link);
	--color-background-code: var(--background-code);
	--color-on-background-code: var(--on-background-code);
}
`;

function TokenOptions({
	name,
	options,
}: {
	name: string;
	options: readonly { value: string; label: string; description: string }[];
}) {
	return (
		<RuiRadioGroupControl class="design-token-panel__options">
			{options.map((option) => (
				<RuiRadio value={option.value} name={name}>
					<span class="design-token-panel__option-copy">
						<span class="design-token-panel__option-label">{option.label}</span>
						<span class="design-token-panel__option-description">{option.description}</span>
					</span>
				</RuiRadio>
			))}
		</RuiRadioGroupControl>
	);
}

/**
 * Docs-only token preview host. Owns its markup via `render()` so nested radio
 * groups are not authored as light-DOM slots (avoids projection wiping selection UI).
 */
@customElement('radiant-design-token-panel')
export class DesignTokenPanelElement extends RadiantElement {
	private selection: TokenSelection = defaultSelection;

	override connectedCallback(): void {
		super.connectedCallback();
		localStorage.removeItem(LEGACY_STORAGE_KEY);
		this.selection = selectionFromDocument();
		this.applyDocumentTokens(this.selection);
		this.requestUpdate();
	}

	@onEvent({ selector: 'rui-radio-group[data-token]', type: 'rui-change' })
	onTokenChange(event: Event): void {
		const group = event.target;
		const token = group instanceof HTMLElement ? group.dataset.token : undefined;
		const value = (event as CustomEvent<{ value?: unknown }>).detail?.value;
		if (!isTokenName(token) || typeof value !== 'string') return;

		this.selection = { ...this.selection, [token]: value };
		this.applyDocumentTokens(this.selection);
		this.resetShellScroll();
	}

	/**
	 * @remarks Focus `scrollIntoView` can still move overflow-hidden shell ancestors in
	 * some engines; pin them back so the docs inset does not jump off-screen.
	 */
	private resetShellScroll(): void {
		queueMicrotask(() => {
			for (const selector of ['.rui-sidebar-provider__body', '.rui-sidebar-provider']) {
				const el = this.closest(selector);
				if (el instanceof HTMLElement && el.scrollTop !== 0) {
					el.scrollTop = 0;
				}
			}
		});
	}

	override render() {
		const { colors, spacing, radius } = this.selection;
		return (
			<section class="design-token-panel" aria-labelledby="design-token-panel-title">
				<div class="design-token-panel__intro">
					<RuiHeading size="sm">
						<RuiHeadingEyebrow>Live token preview</RuiHeadingEyebrow>
						<RuiHeadingTitle id="design-token-panel-title">Try a theme combination</RuiHeadingTitle>
						<RuiHeadingDescription>
							Selections apply to the complete docs page immediately. A full reload restores the default
							theme.
						</RuiHeadingDescription>
					</RuiHeading>
				</div>
				<div class="design-token-panel__groups">
					<div class="design-token-panel__group">
						<RuiLabel>Colour theme</RuiLabel>
						<RuiRadioGroup
							value={colors}
							name="docs-color-theme"
							label="Colour theme"
							data-token="colors"
						>
							<TokenOptions name="docs-color-theme" options={colorOptions} />
						</RuiRadioGroup>
					</div>
					<div class="design-token-panel__group">
						<RuiLabel>Spacing</RuiLabel>
						<RuiRadioGroup value={spacing} name="docs-spacing" label="Spacing" data-token="spacing">
							<TokenOptions name="docs-spacing" options={spacingOptions} />
						</RuiRadioGroup>
					</div>
					<div class="design-token-panel__group">
						<RuiLabel>Shape</RuiLabel>
						<RuiRadioGroup value={radius} name="docs-radius" label="Shape" data-token="radius">
							<TokenOptions name="docs-radius" options={radiusOptions} />
						</RuiRadioGroup>
					</div>
				</div>
			</section>
		);
	}

	private applyDocumentTokens(selection: TokenSelection): void {
		const root = document.documentElement;
		setTokenAttribute(root, 'ruiColors', selection.colors);
		setTokenAttribute(root, 'ruiSpacing', selection.spacing);
		setTokenAttribute(root, 'ruiRadius', selection.radius);
		this.applyDocsTokenOverrides();
	}

	private applyDocsTokenOverrides(): void {
		let style = document.getElementById(OVERRIDE_STYLE_ID);
		if (!(style instanceof HTMLStyleElement)) {
			style?.remove();
			style = document.createElement('style');
			style.id = OVERRIDE_STYLE_ID;
			document.head.append(style);
		}
		style.textContent = docsTokenOverrides;
	}
}

function isTokenName(value: string | undefined): value is TokenName {
	return value === 'colors' || value === 'spacing' || value === 'radius';
}

/** Reads the live docs preview attrs, or defaults when the document has none (fresh load). */
function selectionFromDocument(): TokenSelection {
	const { ruiColors, ruiSpacing, ruiRadius } = document.documentElement.dataset;
	return {
		colors: ruiColors === 'glacier' || ruiColors == null || ruiColors === '' ? 'default' : ruiColors,
		spacing: ruiSpacing != null && ruiSpacing !== '' ? ruiSpacing : defaultSelection.spacing,
		radius: ruiRadius != null && ruiRadius !== '' ? ruiRadius : defaultSelection.radius,
	};
}

function setTokenAttribute(root: HTMLElement, name: 'ruiColors' | 'ruiSpacing' | 'ruiRadius', value: string): void {
	root.dataset[name] = name === 'ruiColors' && value === 'default' ? 'glacier' : value;
}

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'radiant-design-token-panel': JsxCustomElementAttributes<DesignTokenPanelElement>;
	}
}
