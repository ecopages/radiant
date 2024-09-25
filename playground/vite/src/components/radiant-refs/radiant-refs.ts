import { RadiantElement, customElement, onEvent, query } from '@ecopages/radiant';

@customElement('radiant-refs')
export class RadiantRefs extends RadiantElement {
  @query({ ref: 'container' }) refContainer!: HTMLDivElement;
  @query({ ref: 'count' }) refCount!: HTMLDivElement;
  @query({ ref: 'item', all: true, cache: false }) refItems!: HTMLDivElement[];

  renderCountMessage() {
    this.refCount.textContent = `Ref Count: ${this.refItems.length}`;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.renderCountMessage();
  }

  @onEvent({ ref: 'create', type: 'click' })
  createRef() {
    this.renderTemplate({
      target: this.refContainer,
      template: `
        <div class="bg-background cursor-pointer p-2" data-ref="item">
          Ref Item
        </div>
      `,
      insert: 'beforeend',
    });

    this.renderCountMessage();
  }

  @onEvent({ ref: 'item', type: 'click' })
  deleteRef(event: Event) {
    (event.target as HTMLDivElement).remove();
    this.renderCountMessage();
  }

  @onEvent({ ref: 'reset', type: 'click' })
  resetRefs() {
    for (const refItem of this.refItems) {
      refItem.remove();
    }
    this.renderCountMessage();
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'radiant-refs': HtmlTag;
    }
  }
}
