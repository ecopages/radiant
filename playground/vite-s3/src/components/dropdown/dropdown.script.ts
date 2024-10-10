import type { FocusableElement } from '@/types';
import { RadiantElement } from '@ecopages/radiant-s3/core/radiant-element';
import { bound } from '@ecopages/radiant-s3/decorators/bound';
import { customElement } from '@ecopages/radiant-s3/decorators/custom-element';
import { onEvent } from '@ecopages/radiant-s3/decorators/on-event';
import { onUpdated } from '@ecopages/radiant-s3/decorators/on-updated';
import { query } from '@ecopages/radiant-s3/decorators/query';
import { reactiveProp } from '@ecopages/radiant-s3/decorators/reactive-prop';
import {
  type Coords,
  type Placement,
  type ShiftOptions,
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
} from '@floating-ui/dom';

export type RadiantDropdownProps = {
  defaultOpen?: boolean;
  placement?: Placement;
  offset?: number;
  arrow?: boolean;
};

/**
 * @element radiant-dropdown
 * @description A dropdown component that can be toggled by a trigger element
 *
 * @ref trigger - The trigger element
 * @ref content - The content container
 * @ref arrow - The arrow element
 * @prop {boolean} defaultOpen - Whether the dropdown should be open by default
 * @prop {Placement} placement - The placement of the dropdown
 * @prop {number} offset - The offset of the dropdown
 * @prop {ShiftOptions} shiftOptions - The shift options of the dropdown {@link ShiftOptions}
 */
@customElement('radiant-dropdown')
export class RadiantDropdown extends RadiantElement {
  static observedAttributes = ['defaultOpen', 'placement', 'offset', 'focusOnOpen'];
  @query({ ref: 'trigger' }) triggerTarget!: HTMLButtonElement;
  @query({ ref: 'content' }) contentTarget!: HTMLElement;
  @query({ ref: 'arrow' }) arrowTarget!: HTMLElement;

  @reactiveProp({ type: Boolean, reflect: true, defaultValue: false }) defaultOpen!: boolean;
  @reactiveProp({ type: String, defaultValue: 'left' }) placement!: Placement;
  @reactiveProp({ type: Number, defaultValue: 6 }) offset!: number;
  @reactiveProp({ type: Boolean, defaultValue: true }) focusOnOpen!: boolean;

  cleanup: ReturnType<typeof autoUpdate> | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.updateFloatingUI();
    if (this.defaultOpen) this.toggleContent();
  }

  @bound
  @onUpdated(['offset', 'placement'])
  updateFloatingUI(): void {
    if (!this.triggerTarget || !this.contentTarget) return;
    computePosition(this.triggerTarget, this.contentTarget, {
      placement: this.placement,
      middleware: [offset(this.offset), flip(), arrow({ element: this.arrowTarget })],
    }).then(({ x, y, placement, middlewareData }) => {
      Object.assign(this.contentTarget.style, {
        left: `${x}px`,
        top: `${y}px`,
      });

      if (!this.arrowTarget) return;

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
  toggleContent(): void {
    if (typeof this.triggerTarget.ariaExpanded === 'undefined') this.triggerTarget.ariaExpanded = 'false';
    this.triggerTarget.setAttribute('aria-expanded', String(this.triggerTarget.ariaExpanded !== 'true'));
    const isOpen = this.triggerTarget.ariaExpanded === 'true';
    this.contentTarget.style.display = isOpen ? 'block' : 'none';

    if (isOpen) {
      this.cleanup = autoUpdate(this.triggerTarget, this.contentTarget, this.updateFloatingUI);
      document.addEventListener('click', this.closeContent);
      this.focusOnOpenChanged();
    } else {
      this.cleanup?.();
    }
  }

  @bound
  focusOnOpenChanged(): void {
    if (this.triggerTarget.ariaExpanded === 'true' && this.focusOnOpen) {
      const firstFocusableElement = this.contentTarget.querySelector(
        'a, button, input, [tabindex]:not([tabindex="-1"])',
      );
      if (firstFocusableElement) {
        (firstFocusableElement as FocusableElement).focus();
      }
    }
  }

  @bound
  closeContent(event: MouseEvent) {
    if (!this.triggerTarget.contains(event.target as Node) && !this.contentTarget.contains(event.target as Node)) {
      this.triggerTarget.setAttribute('aria-expanded', 'false');
      this.contentTarget.style.display = 'none';
      document.removeEventListener('click', this.closeContent);
      this.cleanup?.();
    }
  }

  override disconnectedCallback(): void {
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
