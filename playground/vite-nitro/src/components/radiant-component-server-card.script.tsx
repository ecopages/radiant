/** @jsxImportSource @ecopages/jsx */

import { RadiantComponent, customElement, onUpdated, reactiveField } from '@ecopages/radiant';

@customElement('radiant-component-server-card')
export class RadiantComponentServerCardElement extends RadiantComponent {
	@reactiveField private status: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
	@reactiveField private message = 'Press the button to fetch the Nitro endpoint from inside a RadiantComponent.';
	@reactiveField private serverTime = 'n/a';

	@onUpdated(['status', 'message', 'serverTime'])
	protected rerenderView(): void {
		this.update();
	}

	private readonly fetchServerMessage = async () => {
		this.status = 'loading';
		this.message = 'Calling /api/hello...';

		try {
			const response = await fetch('/api/hello');

			if (!response.ok) {
				throw new Error(`Request failed with ${response.status}`);
			}

			const payload = (await response.json()) as {
				message: string;
				runtime: string;
				generatedAt: string;
			};

			this.status = 'ready';
			this.message = `${payload.message} via ${payload.runtime}`;
			this.serverTime = payload.generatedAt;
		} catch (error) {
			this.status = 'error';
			this.message = error instanceof Error ? error.message : 'Unknown error';
			this.serverTime = 'n/a';
		}
	};

	override render() {
		return (
			<section class="component-card component-card--server">
				<p class="component-tag">Decorator-driven rerender</p>
				<h3>Nitro-backed update flow</h3>
				<p class="component-copy">
					This example keeps rerenders explicit: field changes trigger <code>@onUpdated</code>, and the
					callback calls <code>update()</code>.
				</p>
				<p class="component-status" data-status={this.status}>
					Status: {this.status}
				</p>
				<p class="component-copy">{this.message}</p>
				<p class="component-meta">Server time: {this.serverTime}</p>
				<div class="component-actions">
					<button type="button" on:click={this.fetchServerMessage} disabled={this.status === 'loading'}>
						{this.status === 'loading' ? 'Loading...' : 'Fetch from Nitro'}
					</button>
				</div>
			</section>
		);
	}
}
