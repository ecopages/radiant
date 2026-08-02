import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { customElement, onEvent } from '@ecopages/radiant';
import { RuiSwitchElement, type RuiSwitchProps } from '@ecopages/radiant-ui/switch';

type ThemeChangeDetail = {
	theme: 'dark' | 'light';
	isDark: boolean;
};

const THEME_TOGGLE_TAG = 'theme-toggle';
const DARK_THEME_QUERY = '(prefers-color-scheme: dark)';
const THEME_CHANGE_EVENT = 'eco:theme-change';

/**
 * Docs theme control built on `rui-switch`.
 *
 * @remarks
 * Persists preference in `localStorage`, mirrors `prefers-color-scheme` when
 * unset, and broadcasts `eco:theme-change` so a freshly mounted toggle (e.g.
 * after SPA layout swap) stays in sync with the document theme.
 */
@customElement(THEME_TOGGLE_TAG)
export class ThemeToggle extends RuiSwitchElement {
	override connectedCallback(): void {
		super.connectedCallback();
		this.syncWithThemePreference();
	}

	@onEvent({ mediaQuery: DARK_THEME_QUERY, type: 'change' })
	onSystemThemeChange(event: MediaQueryListEvent) {
		if (localStorage.getItem('theme')) {
			return;
		}

		this.applyTheme(event.matches);
	}

	@onEvent({ selector: THEME_TOGGLE_TAG, type: 'rui-change' })
	onToggleChange() {
		this.handleThemeChange();
	}

	@onEvent({ window: true, type: THEME_CHANGE_EVENT })
	onThemeChange(event: CustomEvent<ThemeChangeDetail>) {
		const { isDark } = event.detail;
		if (this.checked !== isDark) {
			this.applyTheme(isDark);
		}
	}

	private handleThemeChange() {
		const isDark = this.checked;
		const theme = isDark ? 'dark' : 'light';
		localStorage.setItem('theme', theme);
		this.updateDocumentClass(isDark);

		window.dispatchEvent(
			new CustomEvent<ThemeChangeDetail>(THEME_CHANGE_EVENT, {
				detail: { theme, isDark },
			}),
		);
	}

	private syncWithThemePreference() {
		const storedTheme = localStorage.getItem('theme');
		const prefersDark =
			typeof window !== 'undefined' && typeof window.matchMedia === 'function'
				? window.matchMedia(DARK_THEME_QUERY).matches
				: false;
		const isDark = storedTheme ? storedTheme === 'dark' : prefersDark;

		this.applyTheme(isDark);
	}

	private applyTheme(isDark: boolean) {
		this.checked = isDark;
		this.updateDocumentClass(isDark);
	}

	private updateDocumentClass(isDark: boolean) {
		const theme = isDark ? 'dark' : 'light';
		document.documentElement.setAttribute('data-theme', theme);
		document.documentElement.classList.toggle('dark', isDark);
	}
}

export type ThemeToggleProps = RuiSwitchProps & {
	id?: string;
};

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'theme-toggle': JsxCustomElementAttributes<ThemeToggle, ThemeToggleProps>;
	}
}
