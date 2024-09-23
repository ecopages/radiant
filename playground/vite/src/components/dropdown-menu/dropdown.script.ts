import { RadiantElement } from '@ecopages/radiant/core';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { query } from '@ecopages/radiant/decorators/query';
import { reactiveProp } from '@ecopages/radiant/decorators/reactive-prop';
import { type Coords, type Placement, arrow, autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';

export type RadiantDropdownProps = {
  defaultOpen: boolean;
  open: boolean;
  placement?: Placement;
  offset?: number;
};

@customElement('radiant-dropdown')
export class RadiantDropdown extends RadiantElement {
  @query({ ref: 'trigger' }) triggerTarget!: HTMLButtonElement;
  @query({ ref: 'content' }) contentTarget!: HTMLElement;
  @query({ ref: 'arrow' }) arrowTarget!: HTMLElement;

  @reactiveProp({ type: String, reflect: true, defaultValue: 'left' }) declare placement: Placement;
  @reactiveProp({ type: Number, reflect: true, defaultValue: 6 }) declare offset: number;

  cleanup: ReturnType<typeof autoUpdate> | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.updateFloatingUI = this.updateFloatingUI.bind(this);
    this.updateFloatingUI();
  }

  updateFloatingUI(): void {
    computePosition(this.triggerTarget, this.contentTarget, {
      placement: this.placement,
      middleware: [offset(this.offset), flip(), shift({ padding: 8 }), arrow({ element: this.arrowTarget })],
    }).then(({ x, y, placement, middlewareData }) => {
      Object.assign(this.contentTarget.style, {
        left: `${x}px`,
        top: `${y}px`,
      });

      const { x: arrowX, y: arrowY } = middlewareData.arrow as Coords;

      const staticSide = {
        top: 'bottom',
        right: 'left',
        bottom: 'top',
        left: 'right',
      }[placement.split('-')[0]] as string;

      Object.assign(this.arrowTarget.style, {
        left: arrowX != null ? `${arrowX}px` : '',
        top: arrowY != null ? `${arrowY}px` : '',
        right: '',
        bottom: '',
        [staticSide]: '-4px',
      });

      this.arrowTarget.dataset.placement = placement;
    });
  }

  @onEvent({ ref: 'trigger', type: 'click' })
  toggleContent() {
    if (typeof this.triggerTarget.ariaExpanded === 'undefined') this.triggerTarget.ariaExpanded = 'false';
    this.triggerTarget.setAttribute('aria-expanded', String(this.triggerTarget.ariaExpanded !== 'true'));
    const isOpen = this.triggerTarget.ariaExpanded === 'true';
    this.contentTarget.style.display = isOpen ? 'block' : 'none';

    console.log({ isOpen });
    if (isOpen) {
      this.cleanup = autoUpdate(this.triggerTarget, this.contentTarget, this.updateFloatingUI);
    } else {
      this.cleanup?.();
    }
  }

  @onEvent({ document: true, type: 'click' })
  closeContent(event: MouseEvent) {
    if (!this.triggerTarget.contains(event.target as Node) && !this.contentTarget.contains(event.target as Node)) {
      this.triggerTarget.setAttribute('aria-expanded', 'false');
      this.contentTarget.style.display = 'none';
      this.cleanup?.();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cleanup?.();
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'radiant-dropdown': HtmlTag & RadiantDropdownProps;
    }
  }
}
