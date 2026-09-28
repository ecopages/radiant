import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, prop, state } from '@ecopages/radiant';

export type RadiantCounterProps = {
	count: number;
	label: string;
};

export type RadiantCounterBindings = RadiantCounterProps & {
	lastAction: string;
};

@customElement('radiant-counter')
export class RadiantCounter extends RadiantElement<RadiantCounterBindings> {
	@prop({ type: Number, reflect: true }) count = 0;
	@prop({ type: String }) label = 'RadiantElement counter';
	@state lastAction = 'Waiting for input';

	private readonly increment = () => {
		this.count += 1;
		this.lastAction = 'Incremented';
	};

	private readonly decrement = () => {
		this.count -= 1;
		this.lastAction = 'Decremented';
	};

	override render() {
		return (
			<section class="component-card component-card--counter">
				<p class="component-tag">RadiantElement</p>
				<h3>{this.label}</h3>
				<p class="component-copy">
					This card uses the new <code>render()</code> + <code>update()</code> flow instead of manual{' '}
					<code>render(template)</code> calls.
				</p>
				<p class="component-metric">Count: {this.$.count}</p>
				<p class="component-copy">Last action: {this.$.lastAction}</p>
				<div class="component-actions">
					<button type="button" on:click={this.decrement}>
						Decrement
					</button>
					<button type="button" on:click={this.increment}>
						Increment
					</button>
				</div>
			</section>
		);
	}
}

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'radiant-counter': JsxCustomElementAttributes<HTMLElement, RadiantCounterProps>;
	}
}
