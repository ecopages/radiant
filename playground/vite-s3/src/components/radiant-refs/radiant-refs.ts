import { RadiantElement, customElement, onEvent, query } from '@ecopages/radiant-s3';

@customElement('radiant-refs')
export class RadiantRefs extends RadiantElement {
  @query({ ref: 'container' }) refContainer!: HTMLDivElement;
  @query({ ref: 'count' }) countTarget!: HTMLDivElement;
  @query({ ref: 'item', all: true, cache: false }) itemTargets!: HTMLDivElement[];

  renderCount() {
    this.countTarget.textContent = `${this.itemTargets.length}`;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.renderCount();
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
      insert: this.itemTargets.length ? 'beforeend' : 'replace',
    });

    this.renderCount();
  }

  @onEvent({ ref: 'item', type: 'click' })
  deleteRef(event: Event) {
    (event.target as HTMLDivElement).remove();
    this.renderCount();
  }

  @onEvent({ ref: 'reset', type: 'click' })
  resetRefs() {
    for (const refItem of this.itemTargets) {
      refItem.remove();
    }

    this.renderTemplate({
      target: this.refContainer,
      template: '<div class="text-center">No Refs</div>',
      insert: 'replace',
    });

    this.renderCount();
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'radiant-refs': HtmlTag;
    }
  }
}
