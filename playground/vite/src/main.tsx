import { RadiantAccordion } from './components/accordion/accordion.kita.tsx';
import { RadiantCounter } from './components/radiant-counter/radiant-counter.kita.tsx';
import { RadiantEvent } from './components/radiant-event/radiant-event.kita.tsx';
import { RadiantRefs } from './components/radiant-refs/radiant-refs.kita.tsx';
import { RadiantTodoApp } from './components/radiant-todo-app/radiant-todo-app.kita.tsx';
import './styles/tailwind.css';

const appRoot = document.querySelector<HTMLDivElement>('#app');

const App = async () => {
  return (
    <main class="grid gap-8">
      <RadiantAccordion
        shouldAnimate={true}
        multiple={false}
        items={[
          { id: 'item-1', title: 'Accordion 1', children: <p>Content 1</p> },
          { id: 'item-2', title: 'Accordion 2', children: <p>Content 2</p> },
          { id: 'item-3', title: 'Accordion 3', children: <p>Content 3</p> },
        ]}
      />
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
