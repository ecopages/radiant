import type { JSX_PROPS } from '@ecopages/jsx';
import { RadiantElement, customElement, fromStore, onEvent } from '@/utils/radiant-browser-runtime';
import { addCartItem, cartStore } from './cart-store';

@customElement('radiant-cart-badge')
export class RadiantCartBadge extends RadiantElement<{ count: number }> {
	declare readonly [JSX_PROPS]?: Record<never, never>;

	@fromStore(cartStore, (state) => state.items.length)
	count!: number;

	override render() {
		return (
			<p
				class="inline-flex items-center gap-2.5 rounded-full bg-primary-container py-1 pr-1 pl-3 text-sm font-medium text-on-primary-container"
				role="status"
			>
				<span>In the bag</span>
				<strong class="grid min-h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-xs font-semibold text-on-primary tabular-nums">
					{this.$.count}
				</strong>
			</p>
		);
	}
}

@customElement('radiant-cart-list')
export class RadiantCartList extends RadiantElement<{ items: string[] }> {
	declare readonly [JSX_PROPS]?: Record<never, never>;

	@fromStore(cartStore, (state) => state.items)
	items!: string[];

	override render() {
		return (
			<ul class="m-0 grid list-none gap-2 p-0 sm:grid-cols-2" role="list">
				{this.items.map((item) => (
					<li class="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-medium text-on-background">
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
			<div class="unstyled grid gap-4 rounded-xl border border-border/70 bg-background-accent p-4 shadow-xs">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<radiant-cart-badge />
					<div class="flex flex-wrap gap-2">
						<button
							class="cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-on-background transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
							type="button"
							data-ref="add-mug"
						>
							Add mug
						</button>
						<button
							class="cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-on-background transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
