import { RadiantElement } from '@ecopages/radiant/core';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { onUpdated } from '@ecopages/radiant/decorators/on-updated';
import { query } from '@ecopages/radiant/decorators/query';
import { reactiveProp } from '@ecopages/radiant/decorators/reactive-prop';
import { stringifyAttribute } from '@ecopages/radiant/tools/stringify-attribute';

export type RadiantValueTesterProps = {
  number?: number;
  string?: string;
  boolean?: boolean;
  object?: Record<string, unknown>;
  array?: unknown[];
};

@customElement('radiant-tester')
export class RadiantValueTester extends RadiantElement {
  @reactiveProp({ type: Number, reflect: true, defaultValue: 0 }) declare number: number;
  @reactiveProp({ type: String, reflect: true, defaultValue: 'string' }) declare string: string;
  @reactiveProp({ type: Boolean, reflect: true, defaultValue: false }) declare boolean: boolean;
  @reactiveProp({ type: Object, reflect: true, defaultValue: { key: 'value' } }) declare object: Record<
    string,
    unknown
  >;
  @reactiveProp({ type: Array, reflect: true, defaultValue: ['value'] }) declare array: unknown[];

  @query({ ref: 'number' }) numberText!: HTMLElement;
  @query({ ref: 'string' }) stringText!: HTMLElement;
  @query({ ref: 'boolean' }) booleanText!: HTMLElement;
  @query({ ref: 'object' }) objectText!: HTMLElement;
  @query({ ref: 'array' }) arrayText!: HTMLElement;

  @onEvent({ ref: 'increment-number', type: 'click' })
  incrementNumber() {
    this.number++;
    console.log(this.number);
  }

  @onEvent({ ref: 'increment-string', type: 'click' })
  randomString() {
    this.string = Math.random().toString(36).substring(7);
    console.log(this.string);
  }

  @onEvent({ ref: 'toggle-boolean', type: 'click' })
  toggleBoolean() {
    this.boolean = !this.boolean;
    console.log(this.boolean);
  }

  @onEvent({ ref: 'update-object', type: 'click' })
  updateObject() {
    this.object = { key: Math.random().toString(36).substring(7) };
    console.log(this.object);
  }

  @onEvent({ ref: 'update-array', type: 'click' })
  updateArray() {
    this.array = [...this.array, Math.random().toString(36).substring(7)];
    console.log(this.array);
  }

  @onUpdated('number')
  updateNumber() {
    this.numberText.textContent = this.number.toString();
  }

  @onUpdated('string')
  updateString() {
    this.stringText.textContent = this.string;
  }

  @onUpdated('boolean')
  updateBoolean() {
    this.booleanText.textContent = this.boolean.toString();
  }

  @onUpdated('object')
  updateObjectText() {
    this.objectText.textContent = JSON.stringify(this.object, null, 2);
  }

  @onUpdated('array')
  updateArrayText() {
    this.arrayText.textContent = JSON.stringify(this.array, null, 2);
  }
}

export const ValueTester = ({ number, string, boolean, object, array }: RadiantValueTesterProps) => {
  return (
    <radiant-tester
      number={number}
      string={string}
      boolean={boolean}
      object={stringifyAttribute(object)}
      array={stringifyAttribute(array)}
      class="grid grid-cols-5 gap-4 max-w-fit"
    >
      <button class="rui-button rui-button--md rui-button--primary" type="button" data-ref="increment-number">
        Increment Number
      </button>
      <button class="rui-button rui-button--md rui-button--primary" type="button" data-ref="increment-string">
        Random String
      </button>
      <button class="rui-button rui-button--md rui-button--primary" type="button" data-ref="toggle-boolean">
        Toggle Boolean
      </button>
      <button class="rui-button rui-button--md rui-button--primary" type="button" data-ref="update-object">
        Update Object
      </button>
      <button class="rui-button rui-button--md rui-button--primary" type="button" data-ref="update-array">
        Update Array
      </button>
      <p data-ref="number"></p>
      <p data-ref="string"></p>
      <p data-ref="boolean"></p>
      <p data-ref="object"></p>
      <p data-ref="array"></p>
    </radiant-tester>
  );
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'radiant-tester': HtmlTag & RadiantValueTesterProps;
    }
  }
}