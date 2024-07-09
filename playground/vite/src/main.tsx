import { RadiantCounter } from './components/radiant-counter/radiant-counter.kita.tsx';
import { RadiantEvent } from './components/radiant-event/radiant-event.kita.tsx';
import { RadiantRefs } from './components/radiant-refs/radiant-refs.kita.tsx';
import { RadiantTodoApp } from './components/radiant-todo-app/radiant-todo-app.kita.tsx';
import './styles/tailwind.css';

const appRoot = document.querySelector<HTMLDivElement>('#app');

const App = async () => {
  return (
    <main class="grid gap-8">
      <RadiantCounter value={1} />
      <RadiantRefs />
      <RadiantTodoApp />
      <RadiantEvent />
    </main>
  );
};

if (appRoot) {
  appRoot.innerHTML = await (<App />);
}
