import { RadiantElement } from '@ecopages/radiant/core';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { onEvent } from '@ecopages/radiant/decorators/on-event';

@customElement('radiant-burger')
export class RadiantCounter extends RadiantElement {
  @onEvent({ selector: 'button', type: 'click' })
  toggleMenu(event: Event) {
    (event.target as HTMLButtonElement).toggleAttribute('aria-expanded');
    window.dispatchEvent(new CustomEvent('toggle-menu'));
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'radiant-burger': HtmlTag;
    }
  }
}
