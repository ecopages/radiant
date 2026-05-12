import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, prop } from '@ecopages/radiant';

export type RadiantCounterProps = {
	value?: number;
};

@customElement('radiant-counter')
export class RadiantCounter extends RadiantElement<RadiantCounterProps> {
	@prop({ type: Number, reflect: true }) value = 0;

	private readonly decrement = () => {
		if (this.value > 0) {
			this.value -= 1;
		}
	};

	private readonly increment = () => {
		this.value += 1;
	};

	override render() {
		return (
			<>
				<button type="button" on:click={this.decrement} aria-label="Decrement">
					-
				</button>
				<span>{this.$.value}</span>
				<button type="button" on:click={this.increment} aria-label="Increment">
					+
				</button>
			</>
		);
	}
}

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'radiant-counter': JsxCustomElementAttributes<RadiantCounter, RadiantCounterProps>;
	}
}
