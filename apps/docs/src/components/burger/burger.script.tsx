import { BurgerEvents } from '@/components/burger/burger.events';
import { RadiantElement, customElement, debounce, onEvent, state } from '@ecopages/radiant';

type RadiantBurgerBindings = {
	expanded: boolean;
};

@customElement('radiant-burger')
export class RadiantBurger extends RadiantElement<RadiantBurgerBindings> {
	@state expanded = false;

	override disconnectedCallback(): void {
		this.closeMenu();
		super.disconnectedCallback();
	}

	private readonly toggleMenu = () => {
		this.expanded = !this.expanded;
		document.body.classList.toggle('overflow-hidden', this.expanded);
		window.dispatchEvent(new CustomEvent(BurgerEvents.TOGGLE_MENU));
	};

	private closeMenu() {
		if (!this.expanded) {
			return;
		}

		this.expanded = false;
		document.body.classList.remove('overflow-hidden');
		window.dispatchEvent(new CustomEvent(BurgerEvents.CLOSE_MENU));
	}

	@onEvent({ window: true, type: 'resize' })
	@debounce(200)
	onResizeReset() {
		this.closeMenu();
	}

	override render() {
		return (
			<button
				type="button"
				class="burger"
				aria={{
					expanded: this.$.expanded,
					label: this.expanded ? 'Close navigation' : 'Open navigation',
				}}
				data={{ expanded: this.$.expanded }}
				on:click={this.toggleMenu}
			>
				<span class="burger__line"></span>
				<span class="burger__line"></span>
				<span class="burger__line"></span>
			</button>
		);
	}
}
