import type { JSX_PROPS } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';
import type { RadiantCodeTabs } from '@/components/code-tabs/code-tabs.script';
import type { RuiComboboxElement } from '@ecopages/radiant-ui/combobox';
import {
	DOCS_DEFAULT_THEME_TUNING,
	DOCS_TUNING_CHANGE_EVENT,
	parseDocsDefaultThemeTuning,
	type DocsDefaultThemeTuning,
} from '@/lib/docs-default-theme-tuning';
import {
	DOCS_FONT_ROLES,
	docsFontFromRow,
	type DocsFont,
	type DocsFontCatalogRow,
	type DocsFontRole,
	type DocsFonts,
} from '@/lib/docs-fonts';
import {
	DOCS_SAVED_THEMES_CHANGE_EVENT,
	canSaveCurrentTheme,
	readCurrentAppearance,
	saveCurrentTheme,
} from '@/lib/docs-saved-themes';
import { docsThemeDefaultFonts } from '@/lib/docs-theme-fonts';
import { highlightCssFigure } from '@/lib/theme-lab/highlight-css';
import { createThemeSpec } from '@/lib/theme-lab/theme-spec';
import { MIN_HUE_CHROMA, hexToOklch, oklchToHex } from '@/lib/theme-lab/oklch-color';
import {
	applyDocumentTokens,
	docsThemeColorOptions,
	isDocsThemeColor,
	type DocsThemeColor,
	readDocsDefaultThemeTuning,
	readDocsFonts,
	readDocsThemeSelection,
	updateDocsDefaultThemeTuning,
	writeDocsFonts,
} from '@/lib/docs-theme-preview';
import { createThemeKit, createThemeKitInstallCommand, themeKitPackageManagers } from '@/lib/theme-lab/theme-kit';

const FONT_QUERY_KEYS: Record<DocsFontRole, string> = {
	sans: 'rui-font-sans',
	heading: 'rui-font-heading',
	mono: 'rui-font-mono',
};
/** The subset of the WebMCP `navigator.modelContext` API this page uses; the API is still a proposal. */
type ModelContextTool = {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
	execute: (args: Record<string, unknown>) => Promise<{ content: { type: 'text'; text: string }[] }>;
};
type ModelContext = { registerTool?: (tool: ModelContextTool) => unknown };

const CATALOG_URL = '/assets/font-catalog.json';

let catalogRequest: Promise<DocsFontCatalogRow[]> | undefined;

/** Fetches the Fontsource catalog once per page, on first use. */
function loadCatalog(): Promise<DocsFontCatalogRow[]> {
	catalogRequest ??= fetch(CATALOG_URL).then((response) => {
		if (!response.ok) throw new Error(`Font catalog request failed with ${response.status}`);
		return response.json() as Promise<DocsFontCatalogRow[]>;
	});
	catalogRequest.catch(() => {
		catalogRequest = undefined;
	});
	return catalogRequest;
}

/**
 * Font pickers, save control and copy-paste output for the theme lab. Fonts live in the shared docs appearance, so a
 * choice applies to every docs page until it is reset. The install command and stylesheet are rebuilt whenever the
 * theme, a font or the Radiant Default tuning changes.
 */
@customElement('radiant-theme-kit')
export class ThemeKitElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: Record<never, never>;
	private catalog: DocsFontCatalogRow[] = [];
	private highlightToken = 0;
	private unregisterTools?: () => void;
	private tuning: DocsDefaultThemeTuning = DOCS_DEFAULT_THEME_TUNING;
	private rootObserver: MutationObserver | null = null;

	private readonly onTuning = (event: Event): void => {
		this.tuning = parseDocsDefaultThemeTuning((event as CustomEvent<unknown>).detail);
		this.sync();
	};

	private readonly onSaved = (): void => this.sync();

	override connectedCallback(): void {
		super.connectedCallback();
		this.tuning = readDocsDefaultThemeTuning();
		const hasUrlFonts = DOCS_FONT_ROLES.some((role) =>
			new URLSearchParams(location.search).has(FONT_QUERY_KEYS[role]),
		);
		if (hasUrlFonts || DOCS_FONT_ROLES.some((role) => readDocsFonts()[role])) {
			void this.ensureCatalog().then(() => (hasUrlFonts ? this.restoreFontsFromUrl() : this.sync()));
		}
		document.addEventListener(DOCS_TUNING_CHANGE_EVENT, this.onTuning);
		this.registerAgentTools();
		document.addEventListener(DOCS_SAVED_THEMES_CHANGE_EVENT, this.onSaved);
		if (typeof MutationObserver !== 'undefined') {
			this.rootObserver = new MutationObserver(() => this.sync());
			this.rootObserver.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['data-rui-theme', 'style'],
			});
		}
		this.sync();
	}

	override disconnectedCallback(): void {
		this.unregisterTools?.();
		this.unregisterTools = undefined;
		document.removeEventListener(DOCS_TUNING_CHANGE_EVENT, this.onTuning);
		document.removeEventListener(DOCS_SAVED_THEMES_CHANGE_EVENT, this.onSaved);
		this.rootObserver?.disconnect();
		this.rootObserver = null;
		super.disconnectedCallback();
	}

	@onEvent({ selector: 'rui-combobox[data-font-role]', type: 'focusin' })
	onFontFocus(event: Event): void {
		const role = (event.target as Element).closest<HTMLElement>('[data-font-role]')?.dataset.fontRole as
			DocsFontRole | undefined;
		void this.ensureCatalog().then(() => (role ? this.populate(role) : undefined));
	}

	@onEvent({ selector: 'rui-combobox[data-font-role]', type: 'rui-change' })
	onFontChange(event: Event): void {
		const combobox = event.target as HTMLElement;
		const role = combobox.dataset.fontRole as DocsFontRole | undefined;
		if (!role || !DOCS_FONT_ROLES.includes(role)) return;
		const [id] = (event as CustomEvent<{ value?: string[] }>).detail?.value ?? [];
		this.chooseFont(role, id ? this.findFont(role, id) : undefined);
	}

	@onEvent({ selector: 'rui-combobox[data-font-role]', type: 'focusout' })
	onFontBlur(): void {
		setTimeout(() => this.sync(), 0);
	}

	@onEvent({ selector: 'input[data-kit-color]', type: 'input' })
	onColorInput(event: Event): void {
		const color = hexToOklch((event.target as HTMLInputElement).value);
		if (!color || color.chroma < MIN_HUE_CHROMA) {
			this.setStatus('That color is grey, so it has no hue. Pick one with some color in it.');
			return;
		}
		this.setHue(Math.round(color.hue) % 360);
	}

	@onEvent({ selector: 'button[data-kit-preset]', type: 'click' })
	onPreset(event: Event): void {
		const hue = Number((event.target as Element).closest<HTMLElement>('[data-kit-preset]')?.dataset.kitPreset);
		if (Number.isFinite(hue)) this.setHue(hue);
	}

	@onEvent({ selector: 'rui-checkbox[data-kit-tint]', type: 'rui-change' })
	onTint(event: Event): void {
		const checked = (event as CustomEvent<{ checked?: boolean }>).detail?.checked === true;
		this.tuning = updateDocsDefaultThemeTuning({
			neutralHue: checked ? this.tuning.primaryHue : DOCS_DEFAULT_THEME_TUNING.neutralHue,
		});
		this.sync();
	}

	@onEvent({ selector: 'button[data-kit-share]', type: 'click' })
	async onShare(): Promise<void> {
		const link = `${location.origin}${location.pathname}${this.currentSpec().query}`;
		try {
			await navigator.clipboard.writeText(link);
			this.setStatus('Link copied. It reproduces this theme, fonts included.');
		} catch {
			this.setStatus('Copy unavailable. Copy the address from the browser bar.');
		}
	}

	@onEvent({ selector: 'form[data-kit-save]', type: 'submit' })
	onSave(event: Event): void {
		event.preventDefault();
		const input = this.querySelector<HTMLInputElement>('input[data-kit-name]');
		const saved = saveCurrentTheme(input?.value ?? '');
		if (!saved) {
			this.setStatus('Give the theme a name to save it.');
			return;
		}
		if (input) input.value = '';
		this.setStatus(`Saved "${saved.name}". It appears in the sidebar.`);
	}

	private async ensureCatalog(): Promise<void> {
		if (this.catalog.length > 0) return;
		try {
			this.catalog = await loadCatalog();
		} catch {
			this.setHint('The font list could not be loaded. Reload to try again.');
			return;
		}
		this.setHint(`Search ${this.catalog.length.toLocaleString('en')} Fontsource fonts.`);
	}

	/**
	 * Fills a combobox with every catalog font that fits its role, once.
	 *
	 * @remarks
	 * The options are added at runtime because the catalog is too large to server-render on every page load. The
	 * combobox reads its options from the DOM when it filters, so appended options take part like any other.
	 */
	private populate(role: DocsFontRole): void {
		if (this.catalog.length === 0) return;
		const combobox = this.querySelector<HTMLElement>(`rui-combobox[data-font-role="${role}"]`);
		const listbox = combobox?.querySelector<HTMLElement>('rui-listbox');
		if (!combobox || !listbox || listbox.dataset.populated) return;
		listbox.dataset.populated = 'true';
		const options = this.catalog
			.filter((row) => role !== 'mono' || row[2] === 'monospace')
			.map((row) => {
				const option = document.createElement('div');
				option.className = 'rui-listbox__option';
				option.setAttribute('role', 'option');
				option.tabIndex = -1;
				option.dataset.value = row[0];
				option.dataset.label = row[1];
				option.textContent = row[1];
				return option;
			});
		(listbox.querySelector('.rui-listbox__list, [role="listbox"]') ?? listbox).append(...options);
		const selected = (combobox as RuiComboboxElement).value;
		if (selected.length > 0) (combobox as RuiComboboxElement).value = [...selected];
	}

	/** The greys carry the primary hue whenever the neutral tint is above its default. */
	private currentSpec() {
		const { colors } = readDocsThemeSelection();
		return createThemeSpec({
			theme: isDocsThemeColor(colors) ? colors : 'rui-default',
			tuning: this.tuning,
			fonts: readDocsFonts(),
		});
	}

	/**
	 * Exposes the theme to in-browser agents through WebMCP when the browser provides it: one tool reads the current
	 * implementation, one changes the theme and returns it. The same data is always available as JSON in `#theme-spec`.
	 */
	private registerAgentTools(): void {
		const context = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
		if (!context?.registerTool) return;
		const reply = () => ({
			content: [{ type: 'text' as const, text: JSON.stringify(this.currentSpec(), null, 2) }],
		});
		const fontProperty = { type: 'string', description: 'A Fontsource font id such as inter or ibm-plex-mono.' };
		context.registerTool({
			name: 'get_theme_implementation',
			description:
				'Returns how to use the theme currently shown on this page in a project: packages to install, the CSS to add, fonts, tuning values, and a link that reproduces it.',
			inputSchema: { type: 'object', properties: {} },
			execute: async () => reply(),
		});
		context.registerTool({
			name: 'set_theme',
			description:
				'Changes the theme shown on this page, then returns its implementation. Tuning values apply to the rui-default theme only.',
			inputSchema: {
				type: 'object',
				properties: {
					theme: { type: 'string', enum: docsThemeColorOptions.map((option) => option.value) },
					primaryHue: { type: 'number', description: 'OKLCH hue in degrees, 0 to 360.' },
					secondaryOffset: { type: 'number', description: 'Degrees from the primary hue, -180 to 180.' },
					neutralHue: { type: 'number', description: 'OKLCH hue of the greys, 0 to 360.' },
					neutralTint: { type: 'number', description: 'Grey chroma multiplier, 1 to 4.' },
					density: { type: 'number', description: '0.85 to 1.15.' },
					radiusScale: {
						type: 'number',
						description: '0 is fully square, 1 is the default, 4 is fully rounded.',
					},
					borderAlpha: { type: 'number', description: 'Border strength in percent, 8 to 100.' },
					fontSans: fontProperty,
					fontHeading: fontProperty,
					fontMono: fontProperty,
				},
			},
			execute: async (args) => {
				if (isDocsThemeColor(args.theme)) applyDocumentTokens({ colors: args.theme });
				const changes: Partial<DocsDefaultThemeTuning> = {};
				for (const key of Object.keys(DOCS_DEFAULT_THEME_TUNING) as (keyof DocsDefaultThemeTuning)[]) {
					if (typeof args[key] === 'number') changes[key] = args[key];
				}
				if (Object.keys(changes).length > 0) this.tuning = updateDocsDefaultThemeTuning(changes);
				const fontArgs = { sans: args.fontSans, heading: args.fontHeading, mono: args.fontMono };
				if (Object.values(fontArgs).some((value) => typeof value === 'string')) {
					await this.ensureCatalog();
					const fonts = { ...readDocsFonts() };
					for (const role of DOCS_FONT_ROLES) {
						const id = fontArgs[role];
						const font = typeof id === 'string' ? this.findFont(role, id) : undefined;
						if (font) fonts[role] = font;
					}
					writeDocsFonts(fonts);
				}
				this.sync();
				return reply();
			},
		});
	}

	/** The greys follow the primary hue whenever the two hues match; the Neutral tint slider sets how strongly. */
	private greysFollowPrimary(): boolean {
		return this.tuning.neutralHue === this.tuning.primaryHue;
	}

	private setHue(hue: number): void {
		this.tuning = updateDocsDefaultThemeTuning(
			this.greysFollowPrimary() ? { primaryHue: hue, neutralHue: hue } : { primaryHue: hue },
		);
		this.sync();
	}

	private syncColor(): void {
		const hue = this.tuning.primaryHue;
		const input = this.querySelector<HTMLInputElement>('input[data-kit-color]');
		const swatch = oklchToHex({ lightness: 0.52, chroma: 0.19, hue });
		if (input && document.activeElement !== input) input.value = swatch;
		const tint = this.querySelector<HTMLInputElement & { checked: boolean }>('rui-checkbox[data-kit-tint]');
		if (tint && tint.checked !== this.greysFollowPrimary()) tint.checked = this.greysFollowPrimary();
		const label = this.querySelector<HTMLElement>('[data-kit-color-hex]');
		if (label) label.textContent = `${swatch}, hue ${hue}`;
		for (const preset of this.querySelectorAll<HTMLElement>('button[data-kit-preset]')) {
			preset.setAttribute('aria-pressed', String(Number(preset.dataset.kitPreset) === hue));
		}
	}

	private findFont(role: DocsFontRole, query: string): DocsFont | undefined {
		const lower = query.toLowerCase();
		const row = this.catalog.find(
			(entry) =>
				(role !== 'mono' || entry[2] === 'monospace') &&
				(entry[1].toLowerCase() === lower || entry[0] === lower),
		);
		return row ? docsFontFromRow(row) : undefined;
	}

	private restoreFontsFromUrl(): void {
		const params = new URLSearchParams(location.search);
		const fonts: DocsFonts = { ...readDocsFonts() };
		for (const role of DOCS_FONT_ROLES) {
			const id = params.get(FONT_QUERY_KEYS[role]);
			const font = id ? this.findFont(role, id) : undefined;
			if (font) fonts[role] = font;
		}
		writeDocsFonts(fonts);
		this.sync();
	}

	private chooseFont(role: DocsFontRole, font: DocsFont | undefined): void {
		const fonts = { ...readDocsFonts() };
		if (font) fonts[role] = font;
		else delete fonts[role];
		writeDocsFonts(fonts);
		this.sync();
	}

	private setHint(message: string): void {
		const hint = this.querySelector<HTMLElement>('[data-kit-font-hint]');
		if (hint && message) hint.textContent = message;
	}

	private setStatus(message: string): void {
		const status = this.querySelector<HTMLElement>('[data-kit-status]');
		if (status) status.textContent = message;
	}

	/**
	 * Shows the theme's own font in each field that has no override, so the fields are never empty.
	 *
	 * @remarks
	 * The name is the placeholder, styled as ordinary text, because the combobox rewrites its input text from its value
	 * whenever that updates and would blank a name written there. An empty combobox value still means "theme default".
	 */
	private paintDefaultFonts(theme: DocsThemeColor, fonts: DocsFonts): void {
		for (const role of DOCS_FONT_ROLES) {
			const combobox = this.querySelector<HTMLElement>(`rui-combobox[data-font-role="${role}"]`);
			if (!combobox) continue;
			combobox.setAttribute('placeholder', docsThemeDefaultFonts[theme][role]);
			combobox.toggleAttribute('data-theme-default', !fonts[role]);
		}
	}

	private sync(): void {
		const fonts = readDocsFonts();
		const { colors } = readDocsThemeSelection();
		const theme = isDocsThemeColor(colors) ? colors : 'rui-default';
		for (const role of DOCS_FONT_ROLES) {
			const combobox = this.querySelector<RuiComboboxElement>(`rui-combobox[data-font-role="${role}"]`);
			const id = fonts[role]?.id;
			if (!combobox) continue;
			if (id) this.populate(role);
			if (combobox.contains(document.activeElement)) continue;
			const current = combobox.value?.[0];
			if ((current ?? undefined) !== id) combobox.value = id ? [id] : [];
		}
		this.paintDefaultFonts(theme, fonts);
		this.syncColor();
		const kit = createThemeKit({ theme, fonts, tuning: this.tuning });
		const install = this.querySelector<RadiantCodeTabs>('.theme-kit__code--install');
		const css = this.querySelector<RadiantCodeTabs>('.theme-kit__code--css');
		if (install) {
			install.tabs = themeKitPackageManagers.map((manager) => ({
				id: manager,
				label: manager,
				code: createThemeKitInstallCommand(manager, kit.packages),
			}));
		}
		if (css) {
			const token = ++this.highlightToken;
			void highlightCssFigure(kit.css).then((html) => {
				if (token === this.highlightToken)
					css.tabs = [{ id: 'css', label: 'styles.css', html, content: kit.css }];
			});
		}
		const spec = this.querySelector<HTMLElement>('script[data-kit-spec]');
		if (spec) spec.textContent = JSON.stringify(this.currentSpec());
		this.toggleAttribute('data-can-save', canSaveCurrentTheme(readCurrentAppearance()));
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'radiant-theme-kit': ThemeKitElement;
	}
}
