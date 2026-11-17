import type { JSX_PROPS } from '@ecopages/jsx';
import { fromExternalStore } from '@ecopages/signals';
import { RadiantElement, customElement, onEvent } from '@/utils/radiant-browser-runtime';
import { addCartItem, cartStore } from './cart-store';

@customElement('radiant-cart-badge')
export class RadiantCartBadge extends RadiantElement<{ count: number }> {
	declare readonly [JSX_PROPS]?: Record<never, never>;

	constructor() {
		super();
		this.registerReactiveMember(
			'count',
			fromExternalStore(cartStore, (state) => state.items.length),
		);
	}

	override render() {
		return (
			<p class="m-0 text-sm text-on-background/80">
				In the bag: <strong data-ref="count">{this.$.count}</strong>
			</p>
		);
	}
}

@customElement('radiant-cart-list')
export class RadiantCartList extends RadiantElement<{ items: string[] }> {
	declare readonly [JSX_PROPS]?: Record<never, never>;

	constructor() {
		super();
		this.registerReactiveMember(
			'items',
			fromExternalStore(cartStore, (state) => state.items),
		);
	}

	override render() {
		const items = this.getReactiveMember<string[]>('items')?.get() ?? [];

		return (
			<ul class="m-0 grid list-none gap-2 p-0" data-ref="items">
				{items.map((item) => (
					<li class="rounded-sm border border-border bg-background px-3 py-2 text-sm text-on-background">
						{item}
					</li>
				))}
			</ul>
		);
	}
}

@customElement('radiant-cart-demo')
export class RadiantCartDemo extends RadiantElement {
	declare readonly [JSX_PROPS]?: Record<never, never>;

	@onEvent({ ref: 'add-mug', type: 'click' })
	addMug() {
		addCartItem('Mug');
	}

	@onEvent({ ref: 'add-lamp', type: 'click' })
	addLamp() {
		addCartItem('Lamp');
	}

	override render() {
		return (
			<div class="grid gap-4 rounded-sm border border-border bg-secondary-container/20 p-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<radiant-cart-badge />
					<div class="flex flex-wrap gap-2">
						<button
							class="rounded-sm border border-border bg-background px-3 py-1.5 text-sm text-on-background"
							type="button"
							data-ref="add-mug"
						>
							Add mug
						</button>
						<button
							class="rounded-sm border border-border bg-background px-3 py-1.5 text-sm text-on-background"
							type="button"
							data-ref="add-lamp"
						>
							Add lamp
						</button>
					</div>
				</div>
				<radiant-cart-list />
			</div>
		);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'radiant-cart-badge': RadiantCartBadge;
		'radiant-cart-demo': RadiantCartDemo;
		'radiant-cart-list': RadiantCartList;
	}
}
