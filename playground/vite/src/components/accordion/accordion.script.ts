import { reactiveField } from '@ecopages/radiant';
import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { query } from '@ecopages/radiant/decorators/query';
import { reactiveProp } from '@ecopages/radiant/decorators/reactive-prop';

export type RadiantAccordionProps = {
  multiple?: boolean;
  shouldAnimate?: boolean;
};

type DetailsAnimation = {
  reference: Animation | null;
  isClosing: boolean;
  isExpanding: boolean;
};

@customElement('radiant-accordion')
export class RadiantAccordion extends RadiantElement {
  @reactiveProp({ type: Boolean, reflect: true, defaultValue: false }) multiple!: boolean;
  @reactiveProp({ type: Boolean, reflect: true, defaultValue: false }) shouldAnimate!: boolean;
  @reactiveField currentIndex!: number;
  @query({ selector: 'details', all: true }) detailsTargets!: HTMLDetailsElement[];
  @query({ selector: 'summary', all: true }) toggleTargets!: HTMLElement[];
  @query({ ref: 'panel', all: true }) panelTargets!: HTMLElement[];

  private animations: DetailsAnimation[] = [];

  connectedCallback(): void {
    for (const _details of this.detailsTargets) {
      this.animations.push({ reference: null, isClosing: false, isExpanding: false });
    }
  }

  @onEvent({ selector: 'summary', type: 'click' })
  toggleDetails(event: Event) {
    event.preventDefault();
    const target = event.target as HTMLElement;
    if (this.shouldAnimate) {
      this.currentIndex = [...this.toggleTargets].indexOf(target);
      if (!this.multiple) this.handleResetSingleMode();
      this.toggleWithAnimation(this.currentIndex);
    } else {
      const parentDetails = target.parentElement as HTMLDetailsElement;
      this.toggleWithoutAnimation(parentDetails);
    }
  }

  private handleResetSingleMode() {
    this.detailsTargets.forEach((item, index) => {
      if (item.open && this.currentIndex !== index) {
        this.toggleWithAnimation(index);
      }
    });
  }

  private toggleWithAnimation(index: number): void {
    this.detailsTargets[index].style.overflow = 'hidden';
    if (this.animations[index].isClosing || !this.detailsTargets[index].open) {
      this.open(index);
    } else if (this.animations[index].isExpanding || this.detailsTargets[index].open) {
      this.shrink(index);
    }
  }

  private toggleWithoutAnimation(parentDetails: HTMLDetailsElement): void {
    parentDetails.open = !parentDetails.open;
    if (!this.multiple) {
      for (const details of this.detailsTargets) {
        if (parentDetails !== details) {
          details.removeAttribute('open');
        }
      }
    }
  }

  private open(index: number): void {
    this.detailsTargets[index].style.height = `${this.detailsTargets[index].offsetHeight}px`;
    this.detailsTargets[index].open = true;
    window.requestAnimationFrame(() => this.expand(index));
  }

  private expand(index: number): void {
    this.animations[index].isExpanding = true;

    const startHeight = `${this.detailsTargets[index].offsetHeight}px`;
    const endHeight = `${this.toggleTargets[index].offsetHeight + this.panelTargets[index].offsetHeight}px`;

    this.animations[index].reference?.cancel();

    const keyframes = {
      height: [startHeight, endHeight],
    };

    const options = {
      duration: 200,
      easing: 'ease-out',
    };

    this.animations[index].reference = this.detailsTargets[index].animate(keyframes, options);

    const animation = this.animations[index].reference;

    if (animation) {
      animation.onfinish = () => {
        this.onToggleFinish(index, true);
        animation.oncancel = () => {
          this.animations[index].isExpanding = false;
        };
      };
    }
  }

  private shrink(index: number): void {
    this.animations[index].isClosing = true;

    const startHeight = `${this.detailsTargets[index].offsetHeight}px`;
    const endHeight = `${this.toggleTargets[index].offsetHeight}px`;

    this.animations[index].reference?.cancel();

    const keyframes = {
      height: [startHeight, endHeight],
    };

    const options = {
      duration: 200,
      easing: 'ease-out',
    };

    this.animations[index].reference = this.detailsTargets[index].animate(keyframes, options);

    const animation = this.animations[index].reference;

    if (animation) {
      animation.onfinish = () => {
        this.onToggleFinish(index, false);
        if (animation) {
          animation.oncancel = () => {
            this.animations[index].isClosing = false;
          };
        }
      };
    }
  }

  private onToggleFinish(index: number, open: boolean): void {
    this.detailsTargets[index].open = open;
    this.animations[index].reference = null;
    this.animations[index].isClosing = false;
    this.animations[index].isExpanding = false;
    this.detailsTargets[index].style.removeProperty('height');
    this.detailsTargets[index].style.removeProperty('overflow');
    this.toggleTargets[index].setAttribute('aria-expanded', `${open}`);

    if (this.detailsTargets[index].style.length === 0) {
      this.detailsTargets[index].removeAttribute('style');
    }
  }

  disconnectedCallback(): void {
    for (const animation of this.animations) {
      animation.reference?.cancel();
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'radiant-accordion': HtmlTag & RadiantAccordionProps;
    }
  }
}
