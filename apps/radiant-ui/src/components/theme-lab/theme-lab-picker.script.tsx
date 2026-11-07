import type { JSX_PROPS } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';
import type { RuiListboxElement } from '@ecopages/radiant-ui/listbox';
import { DOCS_DEFAULT_THEME_TUNING, DOCS_TUNING_CHANGE_EVENT } from '@/lib/docs-default-theme-tuning';
import {
	applySavedTheme,
	deleteSavedTheme,
	DOCS_SAVED_THEMES_CHANGE_EVENT,
	isAppearanceCustomized,
	isSavedThemeActive,
	readCurrentAppearance,
	readSavedThemes,
	type DocsSavedTheme,
} from '@/lib/docs-saved-themes';
import {
	applyDocumentTokens,
	isDocsThemeColor,
	readDocsThemeSelection,
	resetDocsAppearance,
} from '@/lib/docs-theme-preview';

/**
 * Sidebar theme chooser for the theme lab: the built-in themes, the visitor's saved themes, and a reset. Every choice
 * is stored as the docs appearance, so it applies on all pages until reset.
 */
@customElement('radiant-theme-lab-picker')
export class ThemeLabPickerElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: Record<never, never>;
	private rootObserver: MutationObserver | null = null;

	private readonly onChange = (): void => this.sync();

	override connectedCallback(): void {
		super.connectedCallback();
		applyDocumentTokens(readDocsThemeSelection(), { persist: false });
		document.addEventListener(DOCS_SAVED_THEMES_CHANGE_EVENT, this.onChange);
		document.addEventListener(DOCS_TUNING_CHANGE_EVENT, this.onChange);
		if (typeof MutationObserver !== 'undefined') {
			this.rootObserver = new MutationObserver(this.onChange);
			this.rootObserver.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['data-rui-theme', 'style'],
			});
		}
		this.sync();
	}

	override disconnectedCallback(): void {
		document.removeEventListener(DOCS_SAVED_THEMES_CHANGE_EVENT, this.onChange);
		document.removeEventListener(DOCS_TUNING_CHANGE_EVENT, this.onChange);
		this.rootObserver?.disconnect();
		this.rootObserver = null;
		super.disconnectedCallback();
	}

	@onEvent({ selector: 'rui-listbox[data-theme-list]', type: 'rui-change' })
	onChooseBuiltIn(event: Event): void {
		const [value] = (event as CustomEvent<{ value?: string[] }>).detail?.value ?? [];
		if (!isDocsThemeColor(value)) return;
		applySavedTheme({ colors: value, tuning: DOCS_DEFAULT_THEME_TUNING, fonts: {} });
	}

	@onEvent({ selector: '[data-saved-theme]', type: 'click' })
	onChooseSaved(event: Event): void {
		const id = (event.target as Element).closest<HTMLElement>('[data-saved-theme]')?.dataset.savedTheme;
		const theme = readSavedThemes().find((saved) => saved.id === id);
		if (theme) applySavedTheme(theme);
	}

	@onEvent({ selector: '[data-delete-theme]', type: 'click' })
	onDelete(event: Event): void {
		const id = (event.target as Element).closest<HTMLElement>('[data-delete-theme]')?.dataset.deleteTheme;
		if (id) deleteSavedTheme(id);
	}

	@onEvent({ selector: '[data-reset-appearance]', type: 'click' })
	onReset(): void {
		resetDocsAppearance();
		document.dispatchEvent(new CustomEvent(DOCS_TUNING_CHANGE_EVENT, { detail: DOCS_DEFAULT_THEME_TUNING }));
	}

	private sync(): void {
		const current = readCurrentAppearance();
		const saved = readSavedThemes();
		const active = saved.find((theme) => isSavedThemeActive(theme, current));

		const list = this.querySelector<RuiListboxElement>('rui-listbox[data-theme-list]');
		const selected = active ? [] : [current.colors];
		if (list && (list.value ?? []).join() !== selected.join()) list.value = selected;
		this.renderSaved(saved, active);
		const reset = this.querySelector<HTMLElement>('[data-reset-section]');
		if (reset) reset.hidden = !isAppearanceCustomized(current);
	}

	private renderSaved(saved: DocsSavedTheme[], active: DocsSavedTheme | undefined): void {
		const section = this.querySelector<HTMLElement>('[data-saved-section]');
		const list = this.querySelector<HTMLElement>('[data-saved-list]');
		if (!section || !list) return;
		section.hidden = saved.length === 0;
		list.replaceChildren(
			...saved.map((theme) => {
				const item = document.createElement('li');
				item.className = 'theme-lab-picker__saved-item';

				const choose = document.createElement('button');
				choose.type = 'button';
				choose.className = 'theme-lab-picker__option';
				choose.dataset.savedTheme = theme.id;
				choose.setAttribute('aria-pressed', String(theme.id === active?.id));

				const swatch = document.createElement('span');
				swatch.className = 'theme-lab-picker__swatch';
				swatch.dataset.themeSwatch = theme.colors;
				swatch.setAttribute('aria-hidden', 'true');

				const name = document.createElement('span');
				name.className = 'theme-lab-picker__label';
				name.textContent = theme.name;
				choose.append(swatch, name);

				const remove = document.createElement('button');
				remove.type = 'button';
				remove.className = 'theme-lab-picker__delete';
				remove.dataset.deleteTheme = theme.id;
				remove.setAttribute('aria-label', `Delete ${theme.name}`);
				remove.textContent = '×';

				item.append(choose, remove);
				return item;
			}),
		);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'radiant-theme-lab-picker': ThemeLabPickerElement;
	}
}
