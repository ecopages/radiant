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
			<p
				class="inline-flex items-center gap-2.5 rounded-full bg-primary-container py-1 pr-1 pl-3 text-sm font-medium text-on-primary-container"
				role="status"
			>
				<span>Signed in as</span>
				<strong class="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-on-primary">
					{this.$.user}
				</strong>
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
			<p
				class="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-medium text-on-background"
				role="status"
			>
				<span>Session theme</span>
				<strong class="rounded-full bg-secondary-container px-2.5 py-1 text-xs font-semibold text-on-secondary-container capitalize">
					{this.$.theme}
				</strong>
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
			<div class="unstyled grid gap-4 rounded-xl border border-border/70 bg-background-accent p-4 shadow-xs">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<radiant-redux-user />
					<div class="flex flex-wrap gap-2">
						<button
							class="cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-on-background transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
							type="button"
							data-ref="rename-bea"
						>
							Sign in as Bea
						</button>
						<button
							class="cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-on-background transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
