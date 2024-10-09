import { describe, expect, test } from 'vitest';
import type { ContextProvider } from '../../src/context/context-provider';
import { createContext } from '../../src/context/create-context';
import { consumeContext } from '../../src/context/decorators/consume-context';
import { contextSelector } from '../../src/context/decorators/context-selector';
import { provideContext } from '../../src/context/decorators/provide-context';
import { ContextEventsTypes } from '../../src/context/events';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';

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

  updateContextValue(value: number) {
    this.context.setContext({ value });
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

describe('Context', () => {
  test('it provides and consumes context correctly', async () => {
    const contextProvider = document.createElement('my-context-provider') as MyContextProvider;
    const contextConsumer = document.createElement('my-context-consumer') as MyContextConsumer;
    contextProvider.appendChild(contextConsumer);
    document.body.appendChild(contextProvider);

    contextConsumer.addEventListener(ContextEventsTypes.MOUNTED, async () => {
      expect(contextConsumer.innerHTML).toEqual('1');
      contextProvider.updateContextValue(3);
      expect(contextConsumer.innerHTML).toEqual('3');
      contextProvider.updateContextValue(5);
      expect(contextConsumer.innerHTML).toEqual('5');
    });
  });
});
