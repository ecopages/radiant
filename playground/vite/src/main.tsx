import type { Placement } from '@floating-ui/dom';
import { RadiantAccordion } from './components/accordion/accordion.kita.tsx';
import { RadiantDropdown } from './components/dropdown/dropdown.kita.tsx';
import { RadiantCounter } from './components/radiant-counter/radiant-counter.kita.tsx';
import { RadiantEvent } from './components/radiant-event/radiant-event.kita.tsx';
import { RadiantRefs } from './components/radiant-refs/radiant-refs.kita.tsx';
import { RadiantTodoApp } from './components/radiant-todo-app/radiant-todo-app.kita.tsx';
import './styles/tailwind.css';
import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { onUpdated } from '@ecopages/radiant/decorators/on-updated';
import { ValueTester } from './components/value-tester/value-tester.script.tsx';

const appRoot = document.querySelector<HTMLDivElement>('#app');

const changePlacement = (newPlacement: Placement) => {
  document.querySelector('radiant-dropdown')?.setAttribute('placement', newPlacement);
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#placement')?.addEventListener('change', (e: Event) => {
    const target = e.target as HTMLSelectElement;
    changePlacement(target.value as Placement);
  });
});

class StepperCounter extends RadiantElement {
  declare value: number;
  declare step: number;
  multiplied = 0;

  constructor() {
    super();
    this.createReactiveProp('value', {
      type: Number,
      defaultValue: 3,
    });
    this.createReactiveProp('step', {
      type: Number,
      defaultValue: 1,
    });
  }

  @onUpdated(['value', 'step'])
  updateCount() {
    this.multiplied = this.value * this.step;
    console.log({ m: this.multiplied });
  }
}

customElements.define('stepper-counter', StepperCounter);

const App = async () => {
  return (
    <main class="grid gap-8">
      <stepper-counter></stepper-counter>
      <RadiantAccordion
        shouldAnimate={true}
        multiple={false}
        items={[
          { id: 'item-1', title: 'Accordion 1', children: <p>Content 1</p> },
          { id: 'item-2', title: 'Accordion 2', children: <p>Content 2</p> },
          { id: 'item-3', title: 'Accordion 3', children: <p>Content 3</p> },
        ]}
      />
      <div class="flex items-center gap-4">
        <RadiantDropdown placement="left-end" arrow>
          <ul class="flex flex-col gap-2">
            <li>
              <a href="/">Option 1</a>
            </li>
            <li>
              <a href="/">Option 2</a>
            </li>
            <li>
              <a href="/">Option 3</a>
            </li>
          </ul>
        </RadiantDropdown>
        <select id="placement">
          <option value="left-start">Left Start</option>
          <option value="left">Left</option>
          <option value="left-end">Left End</option>
          <option value="top-start">Top Start</option>
          <option value="top">Top</option>
          <option value="top-end">Top End</option>
          <option value="right-start">Right Start</option>
          <option value="right">Right</option>
          <option value="right-end">Right End</option>
          <option value="bottom-start">Bottom Start</option>
          <option value="bottom">Bottom</option>
          <option value="bottom-end">Bottom End</option>
        </select>
      </div>
      <RadiantCounter value={5} />
      <RadiantCounter value={8} />
      <RadiantCounter />
      <RadiantRefs />
      <RadiantTodoApp />
      <RadiantEvent />
      <ValueTester number={1} string="string" boolean={false} array={['value']} object={{ key: 'value' }} />
    </main>
  );
};

if (appRoot) {
  appRoot.innerHTML = await (<App />);
}
