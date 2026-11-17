import type { JSX_PROPS } from '@ecopages/jsx';
import { RadiantElement, customElement, fromStore, onEvent } from '@/utils/radiant-browser-runtime';
import { renameSessionUser, sessionStore, toggleSessionTheme } from './session-store';

@customElement('radiant-redux-user')
export class RadiantReduxUser extends RadiantElement<{ user: string }> {
	declare readonly [JSX_PROPS]?: Record<never, never>;

	@fromStore(sessionStore, (state) => state.user)
	user!: string;

	override render() {
		return (
			<p class="m-0 text-sm text-on-background/80">
				Signed in as <strong>{this.$.user}</strong>
			</p>
		);
	}
}

@customElement('radiant-redux-theme')
export class RadiantReduxTheme extends RadiantElement<{ theme: string }> {
	declare readonly [JSX_PROPS]?: Record<never, never>;

	@fromStore(sessionStore, (state) => state.theme)
	theme!: string;

	override render() {
		return (
			<p class="m-0 text-sm text-on-background/80">
				Theme: <strong>{this.$.theme}</strong>
			</p>
		);
	}
}

@customElement('radiant-redux-demo')
export class RadiantReduxDemo extends RadiantElement {
	declare readonly [JSX_PROPS]?: Record<never, never>;

	@onEvent({ ref: 'rename-bea', type: 'click' })
	signInAsBea() {
		renameSessionUser('Bea');
	}

	@onEvent({ ref: 'toggle-theme', type: 'click' })
	toggleTheme() {
		toggleSessionTheme();
	}

	override render() {
		return (
			<div class="grid gap-4 rounded-sm border border-border bg-secondary-container/20 p-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<radiant-redux-user />
					<div class="flex flex-wrap gap-2">
						<button
							class="rounded-sm border border-border bg-background px-3 py-1.5 text-sm text-on-background"
							type="button"
							data-ref="rename-bea"
						>
							Sign in as Bea
						</button>
						<button
							class="rounded-sm border border-border bg-background px-3 py-1.5 text-sm text-on-background"
							type="button"
							data-ref="toggle-theme"
						>
							Toggle theme
						</button>
					</div>
				</div>
				<radiant-redux-theme />
			</div>
		);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'radiant-redux-demo': RadiantReduxDemo;
		'radiant-redux-theme': RadiantReduxTheme;
		'radiant-redux-user': RadiantReduxUser;
	}
}
