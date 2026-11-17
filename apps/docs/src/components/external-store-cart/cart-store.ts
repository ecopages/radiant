/**
 * A Zustand-shaped store that does not belong to any host.
 *
 * @remarks Checkout, analytics, or a React island would write through `setState`.
 * Radiant hosts only read slices of it.
 */
export type CartState = {
	items: string[];
};

type Listener = () => void;

let current: CartState = { items: ['Mug'] };
const listeners = new Set<Listener>();

export const cartStore = {
	getState: (): CartState => current,
	setState(partial: Partial<CartState>) {
		current = { ...current, ...partial };
		for (const listener of [...listeners]) listener();
	},
	subscribe(listener: Listener) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
};

export function addCartItem(name: string): void {
	cartStore.setState({ items: [...cartStore.getState().items, name] });
}
