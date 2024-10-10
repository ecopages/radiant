import type { ContextProvider } from './context/context-provider';
import { createContext } from './context/create-context';
import { consumeContext } from './context/decorators/consume-context';
import { contextSelector } from './context/decorators/context-selector';
import { provideContext } from './context/decorators/provide-context';
import { RadiantElement, type RenderInsertPosition } from './core/radiant-element';
import { bound } from './decorators/bound';
import { customElement } from './decorators/custom-element';
import { debounce } from './decorators/debounce';
import { event } from './decorators/event';
import { onEvent } from './decorators/on-event';
import { onUpdated } from './decorators/on-updated';
import { query } from './decorators/query';
import { reactiveField } from './decorators/reactive-field';
import { reactiveProp } from './decorators/reactive-prop';
import { WithKita } from './mixins/with-kita';
import type { EventEmitter } from './tools/event-emitter';

enum RadiantEventEvents {
  CustomEvent = 'custom-event',
}

type RadiantEventDetail = {
  value: string;
};

declare global {
  interface GlobalEventHandlersEventMap {
    [RadiantEventEvents.CustomEvent]: CustomEvent<RadiantEventDetail>;
  }
}

@customElement('radiant-element')
export class RadiantTester extends RadiantElement {
  @query({ ref: 'text', cache: true }) textTarget: HTMLElement;
  @query({ ref: 'debounce-button' }) buttonTarget: HTMLButtonElement;
  @query({ selector: 'ul', cache: true }) ulTarget: HTMLUListElement;
  @query({ selector: 'li', all: true, cache: true }) liTarget: HTMLLIElement[];
  @reactiveField reactiveField = 'my-value';
  @reactiveProp({ type: String })
  rprop = 'my-reactive-value';
  @event({ name: RadiantEventEvents.CustomEvent, bubbles: true, composed: true })
  customEvent!: EventEmitter<RadiantEventDetail>;

  // Review @reactiveProp
  static observedAttributes = ['rprop'];

  declare foo: string;
  declare currentDate: Date;

  override connectedCallback(): void {
    super.connectedCallback();
    this.buttonTarget.addEventListener('click', this.handleClick);
    console.info('This element is cached, lenght is:', this.liTarget.length);
    this.addListItem();
    console.log('REACTIVE FIELD', this.reactiveField);
    console.log('REACTIVE PROP', this.rprop);

    setTimeout(() => {
      this.customEvent.emit({ value: 'Hello World' });
    }, 2000);
  }

  addListItem(): void {
    const li = document.createElement('li');
    li.textContent = 'New list item';
    this.ulTarget.appendChild(li);
    console.log(
      'Here I am adding a <li> and if cache works it should not update the length. Lenght is:',
      this.liTarget.length,
    );
  }

  @bound
  updateReactivityKeys(): void {
    this.reactiveField = `[FIELD] ${new Date().toLocaleTimeString()}`;
    this.rprop = `[PROP] ${new Date().toLocaleTimeString()}`;
    this.textTarget.textContent = this.reactiveField;
  }

  @onUpdated('reactiveField')
  updatedReactiveField(): void {
    console.log('Reactive field has been updated');
  }

  @onUpdated('rprop')
  updatedReactiveProp(): void {
    console.log('Reactive prop has been updated -->', this.rprop);
    this.renderTemplate({
      template: `<p>${this.rprop}</p>`,
      target: this,
      insert: 'beforeend',
    });
  }

  @bound
  @debounce(1000)
  public handleClick(): void {
    this.updateReactivityKeys();
  }
}

/**
 * Attaches an external listener for a custom event for demo purposes.
 * Since the component is rendered client-side, the listener is added post-render.
 */
setTimeout(() => {
  (document.querySelector('radiant-element') as RadiantTester).addEventListener(
    RadiantEventEvents.CustomEvent,
    (event: CustomEvent<RadiantEventDetail>) => {
      console.log('External Listener:', event.detail.value);
    },
  );
  console.log('External listener added');
}, 500);

@customElement('radiant-sizer')
export class RadiantWindowSizer extends RadiantElement {
  @query({ ref: 'window' }) windowSize!: HTMLElement;
  @query({ ref: 'element' }) elementSize!: HTMLElement;

  override connectedCallback(): void {
    super.connectedCallback();
    this.onResize();
  }

  @onEvent({ window: true, type: 'resize' })
  @debounce(200)
  onResize() {
    console.log('Resized');
    this.windowSize.textContent = `${window.innerWidth} x ${window.innerHeight}`;
    this.elementSize.textContent = `${this.offsetWidth} x ${this.offsetHeight}`;
  }
}

type TestContext = {
  value: number;
};

const testContext = createContext<TestContext>(Symbol('todo-context'));

@customElement('my-context-provider')
export class MyContextProvider extends RadiantElement {
  @provideContext<typeof testContext>({
    context: testContext,
    initialValue: { value: 1 },
    hydrate: Object,
  })
  context!: ContextProvider<typeof testContext>;

  @onEvent({ selector: 'button', type: 'click' })
  updateContextValue() {
    this.context.setContext({ value: this.context.getContext().value + 1 });
  }
}

@customElement('my-context-consumer')
export class MyContextConsumer extends RadiantElement {
  @consumeContext(testContext) context!: ContextProvider<typeof testContext>;
  @contextSelector({ context: testContext, select: (context) => context.value })
  onUpdateValue(value: number) {
    this.innerHTML = value.toString();
  }
}

const Message = ({ children, extra }: { children: string; extra: string }) => {
  return (
    <p>
      {children as 'safe'} {extra as 'safe'}
    </p>
  );
};

@customElement('with-kita')
export class MyWithKitaElement extends WithKita(RadiantElement) {
  @reactiveProp<RenderInsertPosition>({ type: String, defaultValue: 'replace' }) insert: RenderInsertPosition;
  @query({ ref: 'message' }) messageTarget: HTMLButtonElement;

  override connectedCallback(): void {
    super.connectedCallback();
    this.renderMessage();
  }

  @onEvent({ selector: 'button', type: 'click' })
  renderMessage() {
    this.renderTemplate({
      target: this.messageTarget,
      template: (
        <div>
          <h1>My Radiant Element</h1>
          <Message extra={Math.random().toString()}>Hello</Message>
        </div>
      ),
      insert: this.insert,
    });
  }
}

@customElement('radiant-counter')
export class RadiantCounter extends RadiantElement {
  @reactiveProp<number>({ type: Number, reflect: true, defaultValue: 3 }) value: number;
  @query({ ref: 'count' }) countText!: HTMLElement;

  @onEvent({ ref: 'decrement', type: 'click' })
  decrement() {
    if (this.value > 0) this.value--;
  }

  @onEvent({ ref: 'increment', type: 'click' })
  increment() {
    this.value++;
  }

  @onUpdated('value')
  updateCount() {
    this.countText.textContent = this.value.toString();
  }
}
