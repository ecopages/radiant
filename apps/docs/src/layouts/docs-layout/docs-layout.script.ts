import { RadiantElement } from '@ecopages/radiant/core';
import { customElement } from '@ecopages/radiant/decorators/custom-element';

@customElement('radiant-navigation')
export class RadiantCounter extends RadiantElement {
  override connectedCallback(): void {
    super.connectedCallback();
    this.toggleNavigation = this.toggleNavigation.bind(this);
    window.addEventListener('toggle-menu', this.toggleNavigation);
  }

  toggleNavigation(): void {
    this.classList.toggle('hidden');
    (this.nextElementSibling as HTMLDivElement).classList.toggle('without-aside');
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'radiant-navigation': HtmlTag;
    }
  }
}
