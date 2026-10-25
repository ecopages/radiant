import type { JsxRenderable } from '@ecopages/jsx';
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

@customElement('hydrated-root-slot-parent-test')
export class HydratedRootSlotParent extends RadiantElement<{ inside: string }> {
	@state inside = 'inside-0';

	override render() {
		return (
			<hydrated-marker-slot-child-test>
				<b title={this.$.inside}>B</b>
			</hydrated-marker-slot-child-test>
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

@customElement('hydrated-region-card-test')
export class HydratedRegionCard extends RadiantElement {
	@state body: JsxRenderable = null;

	override render() {
		return <main class="card">{this.body}</main>;
	}
}

@customElement('hydrated-region-parent-test')
export class HydratedRegionParent extends RadiantElement<{ label: string }> {
	@state label = 'one';
	@state showBadge = false;

	override render() {
		return (
			<section>
				<hydrated-region-card-test
					prop:body={
						<>
							<span class="label">{this.$.label}</span>
							{this.showBadge ? <b class="badge">new</b> : null}
						</>
					}
				/>
			</section>
		);
	}
}

@customElement('hydrated-nested-counter-test')
export class HydratedNestedCounter extends RadiantElement<{ count: number }> {
	@state count = 0;

	private readonly increment = () => {
		this.count += 1;
	};

	override render() {
		return (
			<div class="counter">
				<button type="button" on:click={this.increment}>
					{this.$.count}
				</button>
				<slot />
			</div>
		);
	}
}

@customElement('hydrated-nested-host-parent-test')
export class HydratedNestedHostParent extends RadiantElement<{ label: string }> {
	@state label = 'one';

	override render() {
		return (
			<section>
				<hydrated-nested-counter-test data-label={this.label}>
					<input class="field" name="field" />
					<span class="label">{this.$.label}</span>
				</hydrated-nested-counter-test>
			</section>
		);
	}
}

@customElement('hydrated-keyed-hosts-parent-test')
export class HydratedKeyedHostsParent extends RadiantElement {
	@state items = ['a', 'b'];

	override render() {
		return (
			<div>
				{this.items.map((item) => (
					<hydrated-marker-slot-child-test key={item}>
						<b>{item}</b>
					</hydrated-marker-slot-child-test>
				))}
			</div>
		);
	}
}

/** A custom element that is not a Radiant host: it keeps its JSX children as DOM. */
class ThirdPartyBox extends HTMLElement {}
customElements.define('hydrated-third-party-box-test', ThirdPartyBox);

@customElement('hydrated-third-party-parent-test')
export class HydratedThirdPartyParent extends RadiantElement<{ inside: string; trailing: string }> {
	@state inside = 'inside-0';
	@state trailing = 'after-0';

	override render() {
		return (
			<div>
				<hydrated-third-party-box-test>
					<b title={this.$.inside}>B</b>
				</hydrated-third-party-box-test>
				<i title={this.$.trailing}>I</i>
			</div>
		);
	}
}

/** Renders `hydrated-late-child-test`, which the browser test defines only after this host hydrated. */
@customElement('hydrated-late-child-parent-test')
export class HydratedLateChildParent extends RadiantElement<{ inside: string; trailing: string }> {
	@state inside = 'inside-0';
	@state trailing = 'after-0';

	override render() {
		return (
			<div>
				<hydrated-late-child-test>
					<b title={this.$.inside}>B</b>
				</hydrated-late-child-test>
				<i title={this.$.trailing}>I</i>
			</div>
		);
	}
}

/** Page-level JSX around a host, outside every host's view: the server gives the host Authored Children. */
export function pageSlotCardView(body: JsxRenderable = 'SSR body') {
	return (
		<main title="page">
			<hydrated-slot-card-test>
				<h2 slot="header">SSR header</h2>
				<p>{body}</p>
			</hydrated-slot-card-test>
		</main>
	);
}

/** Page-level JSX with no binding of its own, so its host's hydration is the only marker source. */
export function staticPageSlotCardView() {
	return (
		<main>
			<h1>SSR title</h1>
			<hydrated-slot-card-test>
				<h2 slot="header">SSR header</h2>
				<p>SSR body</p>
			</hydrated-slot-card-test>
		</main>
	);
}

@customElement('hydrated-bindless-slot-card-test')
export class HydratedBindlessSlotCard extends RadiantElement {
	override render() {
		return (
			<section>
				<header>
					<slot name="header" />
				</header>
				<div>
					<slot />
				</div>
			</section>
		);
	}
}

/** Page-level JSX with no binding of its own around a host whose view has no binding either, only slots. */
export function staticPageBindlessCardView() {
	return (
		<main>
			<h1>SSR title</h1>
			<hydrated-bindless-slot-card-test>
				<h2 slot="header">SSR header</h2>
				<p>SSR body</p>
			</hydrated-bindless-slot-card-test>
		</main>
	);
}

@customElement('hydrated-optional-children-parent-test')
export class HydratedOptionalChildrenParent extends RadiantElement<{ show: boolean }> {
	@state show = false;

	override render() {
		return (
			<section title="optional">
				<hydrated-marker-slot-child-test>
					{this.show ? <b>shown</b> : undefined}
				</hydrated-marker-slot-child-test>
			</section>
		);
	}
}

/** Page-level JSX around a host whose only children go to its default slot, with a handler and a reactive text. */
export function pageBuyCardView(count: JsxRenderable, onBuy: () => void) {
	return (
		<main title="page">
			<hydrated-marker-slot-child-test>
				<button type="button" on:click={onBuy}>
					Buy {count}
				</button>
			</hydrated-marker-slot-child-test>
		</main>
	);
}
