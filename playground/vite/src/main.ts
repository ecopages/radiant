import { RadiantCounter } from './components/radiant-counter/radiant-counter.kita.tsx';
import { RadiantRefs } from './components/radiant-refs/radiant-refs.kita.tsx';
import { RadiantTodoApp } from './components/radiant-todo-app/radiant-todo-app.kita.tsx';
import './styles/tailwind.css';

const rootCounter = document.querySelector<HTMLDivElement>('#counter');
const rootTodoApp = document.querySelector<HTMLDivElement>('#todo-app');
const rootRadiantRefs = document.querySelector<HTMLDivElement>('#radiant-refs');

if (rootCounter) {
  rootCounter.innerHTML = RadiantCounter({ value: 0 }) as string;
}

if (rootTodoApp) {
  async function getRadiantTodoApp() {
    return await RadiantTodoApp();
  }
  rootTodoApp.innerHTML = await getRadiantTodoApp();
}

if (rootRadiantRefs) {
  rootRadiantRefs.innerHTML = RadiantRefs() as string;
}
