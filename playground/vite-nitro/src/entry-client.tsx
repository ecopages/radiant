import './components/radiant-component-counter.script';
import './components/radiant-event-binding-lab.script';
import './components/radiant-context-flow-shell.script';
import './components/radiant-signal-release-board.script';
import './components/radiant-slot-studio-board.script.tsx';
import { isPlaygroundPath, mount } from './app';
import './style.css';

const element = document.querySelector<HTMLElement>('#app');

if (!element) {
	throw new Error('Missing #app mount node.');
}

if (!isPlaygroundPath(window.location.pathname)) {
	throw new Error(`Unknown page for ${window.location.pathname}.`);
}

mount(element);
