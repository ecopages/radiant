import { RadiantElement } from '../../../src/core/radiant-element';
import { customElement } from '../../../src/decorators/custom-element';
import { prop } from '../../../src/decorators/prop';
import { state } from '../../../src/decorators/state';

/**
 * Components rendered on the server by `test/server/ssr-hydration-fixtures.test.tsx` and hydrated in the browser
 * by `test/client/ssr-hydration.browser.test.tsx`.
 */
@customElement('hydrated-counter-test')
export class HydratedCounter extends RadiantElement {
	count = 0;

	private readonly increment = () => {
		this.count += 1;
		this.update();
	};

	override render() {
		return (
			<button type="button" on:click={this.increment}>
				Count {this.count}
			</button>
		);
	}
}

@customElement('hydrated-slot-card-test')
export class HydratedSlotCard extends RadiantElement {
	count = 0;

	private readonly increment = () => {
		this.count += 1;
		this.update();
	};

	override render() {
		return (
			<section>
				<header>
					<slot name="header" />
				</header>
				<div>
					<slot />
				</div>
				<button type="button" on:click={this.increment}>
					Count {this.count}
				</button>
			</section>
		);
	}
}

@customElement('hydrated-marker-slot-child-test')
export class HydratedMarkerSlotChild extends RadiantElement {
	override render() {
		return (
			<div class="child">
				<slot />
			</div>
		);
	}
}

@customElement('hydrated-marker-slot-parent-test')
export class HydratedMarkerSlotParent extends RadiantElement<{ inside: string; trailing: string }> {
	@state inside = 'inside-0';
	@state trailing = 'after-0';

	override render() {
		return (
			<div>
				<hydrated-marker-slot-child-test>
					<b title={this.$.inside}>B</b>
				</hydrated-marker-slot-child-test>
				<i title={this.$.trailing}>I</i>
			</div>
		);
	}
}

@customElement('hydrated-fragment-slot-parent-test')
export class HydratedFragmentSlotParent extends RadiantElement<{ inside: string; leading: string }> {
	@state inside = 'inside-0';
	@state leading = 'before-0';

	override render() {
		return (
			<>
				<i title={this.$.leading}>I</i>
				<hydrated-marker-slot-child-test>
					<b title={this.$.inside}>B</b>
				</hydrated-marker-slot-child-test>
			</>
		);
	}
}

@customElement('hydrated-static-view-test')
export class HydratedStaticView extends RadiantElement {
	override render() {
		return <p>Static server view</p>;
	}
}

@customElement('hydrated-complex-slot-card-test')
export class HydratedComplexSlotCard extends RadiantElement {
	count = 0;

	private readonly increment = () => {
		this.count += 1;
		this.update();
	};

	override render() {
		return (
			<section>
				<header>
					<slot name="header" />
				</header>
				<div data-ref="body">
					<slot />
				</div>
				<footer>
					<slot name="footer" />
				</footer>
				<button type="button" on:click={this.increment}>
					Count {this.count}
				</button>
			</section>
		);
	}
}

@customElement('non-hydrated-counter-test')
export class NonHydratedCounter extends RadiantElement {
	count = 0;

	override render() {
		return <button type="button">Count {this.count}</button>;
	}
}

@customElement('deferred-hydrated-card-test')
export class DeferredHydratedCard extends RadiantElement {
	count = 0;

	constructor() {
		super();
		this.count = 2;
		this.update();
	}

	private readonly increment = () => {
		this.count += 1;
		this.update();
	};

	override render() {
		return (
			<section>
				<h3>Hydrated card</h3>
				<p data-ref="count">Count: {this.count}</p>
				<div>
					<button type="button" on:click={this.increment}>
						Increment
					</button>
				</div>
			</section>
		);
	}
}

@customElement('hydrated-counter-binding-test')
export class HydratedCounterBinding extends RadiantElement<{ value: number }> {
	@prop({ type: Number, reflect: true, defaultValue: 0 }) value: number;

	private readonly increment = () => {
		this.value += 1;
	};

	override render() {
		return (
			<>
				<button data-testid="inc-binding" on:click={this.increment}>
					+
				</button>
				<span data-testid="binding">{this.$.value}</span>
			</>
		);
	}
}

@customElement('hydrated-array-prop-card-test')
export class HydratedArrayPropCard extends RadiantElement {
	@prop({ type: Array }) items = [] as Array<{ label: string }>;

	override render() {
		return <p>{this.items.map((item) => item.label).join(', ') || 'empty'}</p>;
	}
}
