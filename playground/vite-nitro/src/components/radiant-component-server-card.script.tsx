import { RadiantComponent, customElement, state } from '@ecopages/radiant';

type RadiantComponentServerCardBindings = {
	status: 'idle' | 'loading' | 'ready' | 'error';
	message: string;
	serverTime: string;
};

@customElement('radiant-component-server-card')
export class RadiantComponentServerCardElement extends RadiantComponent<RadiantComponentServerCardBindings> {
	@state status: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
	@state message = 'Press the button to fetch the Nitro endpoint from inside a RadiantComponent.';
	@state serverTime = 'n/a';

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
				<p class="component-tag">State-driven rerender</p>
				<h3>Nitro-backed update flow</h3>
				<p class="component-copy">
					This example uses <code>@state</code> for internal data so async updates flow straight back into
					render without manual <code>update()</code> calls.
				</p>
				<p class="component-status" data-status={this.$.status}>
					Status: {this.$.status}
				</p>
				<p class="component-copy">{this.$.message}</p>
				<p class="component-meta">Server time: {this.$.serverTime}</p>
				<div class="component-actions">
					<button type="button" on:click={this.fetchServerMessage} disabled={this.status === 'loading'}>
						{this.status === 'loading' ? 'Loading...' : 'Fetch from Nitro'}
					</button>
				</div>
			</section>
		);
	}
}
