import { RadiantComponent, customElement, jsxProp } from '@ecopages/radiant';

export type RadiantComponentCounterProps = {
	count?: number;
	label?: string;
};

@customElement('radiant-component-counter')
export class RadiantComponentCounterElement extends RadiantComponent {
	@jsxProp({ type: Number, reflect: true }) count = 0;
	@jsxProp({ type: String }) label = 'RadiantComponent counter';

	private readonly increment = () => {
		this.count += 1;
	};

	private readonly decrement = () => {
		this.count -= 1;
	};

	override render() {
		return (
			<section class="component-card component-card--counter">
				<p class="component-tag">RadiantComponent</p>
				<h3>{this.bind('label')}</h3>
				<p class="component-copy">
					This card uses the new <code>render()</code> + <code>update()</code> flow instead of manual{' '}
					<code>render(template)</code> calls.
				</p>
				<p class="component-metric">Count: {this.bind('count')}</p>
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
