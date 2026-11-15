import { RadiantController, controller, onEvent, query } from '@ecopages/radiant';
import { createPointerDragController } from '@ecopages/radiant-ui/controllers';
import { resolveSwipeDirection } from '@ecopages/radiant-ui/helpers';

@controller('swipe-card')
export class SwipeCardController extends RadiantController {
	@query({ selector: '[data-swipe-card]' }) private card!: HTMLElement;
	@query({ selector: '[data-dismiss]' }) private dismissButton!: HTMLElement;
	@query({ selector: '[data-restore]' }) private restoreButton!: HTMLElement;
	@query({ selector: '[data-status]' }) private status!: HTMLElement;

	constructor(host: Element) {
		super(host);
		createPointerDragController(this, {
			getTarget: () => this.card,
			capture: false,
			canStart: (event) => !(event.target instanceof Element && event.target.closest('button')),
			onStart: () => {
				this.card.dataset.dragging = '';
			},
			onMove: ({ dx }) => this.follow(dx),
			onEnd: ({ reason, dx, dy, elapsedMs }) => {
				delete this.card.dataset.dragging;
				const direction =
					reason === 'release'
						? resolveSwipeDirection(dx, dy, { minVelocity: 0.5, dominance: 2, elapsedMs })
						: null;
				if (!direction) {
					this.follow(0);
					return;
				}
				this.follow(direction === 'left' ? -this.card.offsetWidth : this.card.offsetWidth);
				Promise.allSettled(this.card.getAnimations().map((animation) => animation.finished)).then(() =>
					this.setShown(false, `Card dismissed, swiped ${direction}`),
				);
			},
		});
	}

	private setShown(shown: boolean, message: string): void {
		const hadFocus = !shown && this.card.contains(document.activeElement);
		this.card.hidden = !shown;
		this.restoreButton.hidden = shown;
		if (hadFocus) {
			this.restoreButton.focus();
		}
		this.status.textContent = message;
		this.card.style.setProperty('--swipe-dx', '0px');
		this.card.style.setProperty('--swipe-opacity', '1');
	}

	private follow(dx: number): void {
		const distance = Math.min(Math.abs(dx) / this.card.offsetWidth, 1);
		this.card.style.setProperty('--swipe-dx', `${dx}px`);
		this.card.style.setProperty('--swipe-opacity', `${1 - distance / 2}`);
	}

	@onEvent({ selector: '[data-dismiss]', type: 'click' })
	dismiss(): void {
		this.setShown(false, 'Card dismissed');
		this.restoreButton.focus();
	}

	@onEvent({ selector: '[data-restore]', type: 'click' })
	restore(): void {
		this.setShown(true, 'The card is shown');
		this.dismissButton.focus();
	}
}
