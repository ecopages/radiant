import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, state } from '@ecopages/radiant';

@customElement('radiant-event-binding-lab')
export class RadiantEventBindingLab extends RadiantElement<{
	autoClicks: number;
	autoLog: string;
	blockedAutoClicks: number;
	blockedZoneLog: string;
	nativeClicks: number;
	nativeLog: string;
}> {
	@state autoClicks = 0;
	@state autoLog = 'Waiting for a delegated click.';
	@state blockedAutoClicks = 0;
	@state blockedZoneLog = 'The blocked bubble zone has not been exercised yet.';
	@state nativeClicks = 0;
	@state nativeLog = 'Waiting for a native click.';

	private readonly handleAutoClick = (event: Event) => {
		this.autoClicks += 1;
		this.autoLog = `on:click ${this.describeEvent(event)}`;
	};

	private readonly handleBlockedAutoClick = (event: Event) => {
		this.blockedAutoClicks += 1;
		this.blockedZoneLog = `Blocked on:click unexpectedly fired with ${this.describeEvent(event)}`;
	};

	private readonly handleNativeClick = (event: Event) => {
		this.nativeClicks += 1;
		this.nativeLog = `on-native:click ${this.describeEvent(event)}`;
	};

	private readonly stopBlockedBubble = (event: Event) => {
		event.stopPropagation();
		this.blockedZoneLog = 'Wrapper stopped bubbling before the root listener.';
	};

	override render() {
		return (
			<section class="component-card component-card--events">
				<p class="component-tag">Event policy</p>
				<h3>Auto delegation with a native escape hatch</h3>
				<p class="component-copy">
					Use <code>on:event</code> as the default. Radiant delegates supported bubbling events and keeps{' '}
					<code>event.currentTarget</code> pointed at the matched element.
				</p>
				<div class="event-lab__layout">
					<section class="event-lab__lane" data-kind="auto">
						<p class="component-meta" data-ref="event-auto-count">
							Auto on:click count: {this.$.autoClicks}
						</p>
						<p class="component-copy" data-ref="event-auto-log">
							Last auto event: {this.$.autoLog}
						</p>
						<button data-ref="event-auto-button" type="button" on:click={this.handleAutoClick}>
							<span>Click nested auto label</span>
						</button>
					</section>
					<section class="event-lab__lane" data-kind="blocked">
						<p class="component-copy">
							This zone stops bubbling before the event reaches the render root.{' '}
							<code>on-native:event</code> still fires because it attaches on the element itself.
						</p>
						<div class="event-lab__blocked-zone" on-native:click={this.stopBlockedBubble}>
							<button
								data-ref="event-blocked-auto-button"
								type="button"
								on:click={this.handleBlockedAutoClick}
							>
								<span>Blocked on:click</span>
							</button>
							<button
								data-ref="event-native-button"
								type="button"
								on-native:click={this.handleNativeClick}
							>
								<span>on-native:click escape hatch</span>
							</button>
						</div>
						<p class="component-meta" data-ref="event-blocked-auto-count">
							Blocked on:click count: {this.$.blockedAutoClicks}
						</p>
						<p class="component-meta" data-ref="event-native-count">
							on-native:click count: {this.$.nativeClicks}
						</p>
						<p class="component-copy" data-ref="event-blocked-note">
							{this.$.blockedZoneLog}
						</p>
						<p class="component-copy" data-ref="event-native-log">
							Last native event: {this.$.nativeLog}
						</p>
					</section>
				</div>
			</section>
		);
	}

	private describeEvent(event: Event): string {
		const currentTarget =
			event.currentTarget instanceof HTMLElement ? event.currentTarget.tagName.toLowerCase() : 'unknown';
		const target = event.target instanceof HTMLElement ? event.target.tagName.toLowerCase() : 'unknown';

		return `currentTarget: ${currentTarget} / target: ${target}`;
	}
}

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'radiant-event-binding-lab': JsxCustomElementAttributes<HTMLElement, Record<never, never>>;
	}
}
