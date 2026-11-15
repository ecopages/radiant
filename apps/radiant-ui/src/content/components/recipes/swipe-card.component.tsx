import { RadiantElement, customElement, onEvent, state } from '@ecopages/radiant';
import { createPointerDragController } from '@ecopages/radiant-ui/controllers';
import { resolveSwipeDirection } from '@ecopages/radiant-ui/helpers';

@customElement('swipe-card-app')
export class SwipeCardApp extends RadiantElement<{ status: string }> {
	@state shown = true;
	@state status = 'The card is shown';

	private focusAfterRender: 'dismiss' | 'restore' | null = null;

	private readonly drag = createPointerDragController(this, {
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

	private get card(): HTMLElement {
		return this.querySelector<HTMLElement>('[data-swipe-card]')!;
	}

	/**
	 * Attaches the drag to the drawn card and moves focus once the render has shown or hidden the buttons.
	 *
	 * @remarks
	 * The drag controller attaches when the element connects, before the first render has made the card, so it
	 * attaches again here, where its target exists. A button that the render is about to hide cannot take focus, so a
	 * focus move is recorded when the state changes and made here, after the commit.
	 */
	protected override updated(): void {
		this.drag.attach();
		if (this.focusAfterRender) {
			this.querySelector<HTMLElement>(`[data-${this.focusAfterRender}]`)?.focus();
			this.focusAfterRender = null;
		}
	}

	/**
	 * The drag writes `--swipe-dx` and `--swipe-opacity` straight onto the card, and `data-dragging` too, so a drag
	 * never re-renders; the render only owns `hidden`.
	 */
	private setShown(shown: boolean, message: string): void {
		if (!shown && this.card.contains(document.activeElement)) {
			this.focusAfterRender = 'restore';
		}
		this.card.style.setProperty('--swipe-dx', '0px');
		this.card.style.setProperty('--swipe-opacity', '1');
		this.shown = shown;
		this.status = message;
	}

	private follow(dx: number): void {
		const distance = Math.min(Math.abs(dx) / this.card.offsetWidth, 1);
		this.card.style.setProperty('--swipe-dx', `${dx}px`);
		this.card.style.setProperty('--swipe-opacity', `${1 - distance / 2}`);
	}

	@onEvent({ selector: '[data-dismiss]', type: 'click' })
	dismiss(): void {
		this.setShown(false, 'Card dismissed');
		this.focusAfterRender = 'restore';
	}

	@onEvent({ selector: '[data-restore]', type: 'click' })
	restore(): void {
		this.setShown(true, 'The card is shown');
		this.focusAfterRender = 'dismiss';
	}

	override render() {
		return (
			<>
				<div data-swipe-card hidden={!this.shown}>
					<span>Your report is ready</span>
					<button type="button" data-dismiss>
						Dismiss
					</button>
				</div>
				<button type="button" data-restore hidden={this.shown}>
					Restore the card
				</button>
				<p data-status aria-live="polite">
					{this.$.status}
				</p>
			</>
		);
	}
}
