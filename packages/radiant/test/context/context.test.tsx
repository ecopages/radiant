import { describe, expect, test } from 'bun:test';
import {
  type ContextProvider,
  RadiantElement,
  consumeContext,
  contextSelector,
  createContext,
  customElement,
  provideContext,
} from '@/index';

type TestContext = {
  value: number;
};

const testContext = createContext<TestContext>(Symbol('todo-context'));

@customElement('my-context-provider')
class MyContextProvider extends RadiantElement {
  @provideContext<typeof testContext>({
    context: testContext,
    initialValue: { value: 1 },
    hydrate: Object,
  })
  context!: ContextProvider<typeof testContext>;

  updateContextValue() {
    this.context.setContext({ value: this.context.getContext().value + 1 });
  }
}

@customElement('my-context-consumer')
class MyContextConsumer extends RadiantElement {
  @consumeContext(testContext) context!: ContextProvider<typeof testContext>;
  @contextSelector({ context: testContext, select: (context) => context.value })
  onUpdateValue(value: number) {
    this.innerHTML = value.toString();
  }
}

const template = '<my-context-provider><my-context-consumer></my-context-consumer></my-context-provider>';

describe('Context', () => {
  test('it provides and consumes context correctly', () => {
    const contextProvider = document.createElement('my-context-provider') as MyContextProvider;
    const contextConsumer = document.createElement('my-context-consumer') as MyContextConsumer;
    contextProvider.appendChild(contextConsumer);
    document.body.appendChild(contextProvider);
    expect(contextConsumer.innerHTML).toEqual('1');
    contextProvider.updateContextValue();
    expect(contextConsumer.innerHTML).toEqual('2');
  });
});
