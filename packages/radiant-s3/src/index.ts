import { RadiantElement } from './core';
import { bound } from './decorators/bound';
import { customElement } from './decorators/custom-element';
import { event } from './decorators/event';
import { onEvent } from './decorators/on-event';
import { onUpdated } from './decorators/on-updated';
import { query } from './decorators/query';
import { reactiveField } from './decorators/reactive-field';
import { reactiveProp } from './decorators/reactive-prop';
import type { EventEmitter } from './tools/event-emitter';

export type Constructor = { new (...args: any[]): NonNullable<unknown> };

export type ConstructorParams<T extends Constructor> = ConstructorParameters<T>;

export type Context = {
  kind: string;
  name: string | symbol;
  access: {
    get?(): unknown;
    set?(value: unknown): void;
    has?(value: unknown): boolean;
  };
  private?: boolean;
  static?: boolean;
  addInitializer?(initializer: () => void): void;
};

export type ClassDecorator = <T extends Constructor>(target: T, context: Context) => T | void;

export type Method = (...args: any[]) => any;

// export function loggableClass(): any {
//   return function <T extends Constructor>(target: T, context: Context): T {
//     return class extends target {
//       public constructor(...args: any[]) {
//         super(...args);
//         console.log(`Constructor ${target.name} has been decorated. It a ${String(context.name)}`, context);
//       }
//     };
//   };
// }

// export function loggableMethod(label: string): Method {
//   return <T extends Method>(value: T, context: Context): Method => {
//     return function (this: any, ...args: any[]): T {
//       console.log(`Method ${value.name} has been decorated`, context, args, label);
//       return value.call(this, ...args) as unknown as T;
//     };
//   };
// }

// export function logged(original: any, context: any): any {
//   function replacementMethod(this: any, ...args: any[]): any {
//     console.log('LOG: Entering method.', context);
//     const result = original.call(this, ...args);
//     console.log('LOG: Exiting method.');
//     return result;
//   }
//   return replacementMethod;
// }

// @loggableClass()
// class Decorated {
//   public constructor() {
//     console.log('Decorated constructor called');
//   }

//   @logged
//   @loggableMethod('label')
//   public methodDecorated(): void {
//     console.log('Decorated method called');
//   }
// }

// const decorated = new Decorated();
// decorated.methodDecorated();

/**
 * This is a decorator that marks a class field as deprecated.
 */
// function deprecated(_: undefined, context: ClassFieldDecoratorContext<RadiantElement, string>) {
//   const kind = context.kind;
//   const name = context.name;
//   return function (initialValue: any) {
//     const msg = `[kind: ${kind} | value: ${initialValue}] ${String(name)} is deprecated and will be removed in a future version.`;
//     console.log(msg);
//     return initialValue;
//   };
// }

/**
 * This is a decorator that adds a field to the prototype.
 */
// function addFieldToPrototype(key: string, value: any) {
//   return function (target: any, context: ClassDecoratorContext<typeof RadiantElement>) {
//     console.log('Add field to prototype', { target, context });
//     target.prototype[key] = value;
//   };
// }

/**
 * This is a decorator that adds a field to the object definition.
 */
// function addFieldToObjectDefinition(key: string, value: any) {
//   return function <T extends { new (...args: any[]): any }>(target: T, context: ClassDecoratorContext<T>) {
//     return class extends target {
//       constructor(...args: any[]) {
//         super(...args);
//         this[key] = value;
//         console.log('Add field in object definition', { [key]: value }, context);
//       }
//     };
//   };
// }

/**
 * This is a decorator that marks a class as sealed.
 * All properties of the class are non-configurable and non-writable.
 * It applies to the class and its prototype. If any properties are added to the class or its prototype after the class is sealed, an error will be thrown.
 */
// function sealed(target: Function) {
//   Object.seal(target);
//   Object.seal(target.prototype);
// }

export function methodDecorated(label: string): Method {
  return <T extends Method>(value: T, context: Context): Method => {
    return function (this: any, ...args: any[]): T {
      console.log(`Method ${value.name} has been decorated`, context, args, label);
      return value.call(this, ...args) as unknown as T;
    };
  };
}

export function debounce(timeout: number): Method {
  let timeoutRef: ReturnType<typeof setTimeout> | null = null;

  return <T extends Method>(originalMethod: T, _: Context): Method => {
    return function (this: any, ...args: any[]): T {
      if (timeoutRef !== null) {
        clearTimeout(timeoutRef);
      }

      timeoutRef = setTimeout(() => {
        originalMethod.apply(this, args);
      }, timeout);

      return originalMethod;
    };
  };
}

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
// @addFieldToPrototype('foo', 'bar')
// @addFieldToObjectDefinition('currentDate', new Date())
// @sealed
export class RadiantTester extends RadiantElement {
  @query({ ref: 'text', cache: true }) textTarget: HTMLElement;
  @query({ ref: 'debounce-button' }) buttonTarget: HTMLButtonElement;
  @query({ selector: 'ul', cache: true }) ulTarget: HTMLUListElement;
  @query({ selector: 'li', all: true, cache: true }) liTarget: NodeListOf<HTMLLIElement>;
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

  @bound()
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
    console.log('Reactive prop has been updated', this.rprop);
    this.renderTemplate({
      template: `<p>${this.rprop}</p>`,
      target: this,
      insert: 'beforeend',
    });
  }

  @bound()
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
