import { LiteCounter } from './components/lite-counter/lite-counter.kita.tsx';
import { LiteTodoApp } from './components/lite-todo-app/lite-todo-app.kita.tsx';

const rootCounter = document.querySelector<HTMLDivElement>('#counter');
const rootTodoApp = document.querySelector<HTMLDivElement>('#todo-app');

if (rootCounter) {
  rootCounter.innerHTML = LiteCounter({ value: 0 }) as string;
}

if (rootTodoApp) {
  async function getLiteTodoApp() {
    return await LiteTodoApp();
  }
  rootTodoApp.innerHTML = await getLiteTodoApp();
}
