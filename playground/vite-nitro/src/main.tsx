import '@ecopages/radiant/client/install-hydrator';
import { startControllers } from '@ecopages/radiant';
import './components/radiant-counter.script';
import './components/radiant-controller-context-visualizer.script';
import './components/radiant-controller-decorator-visualizer.script';
import './components/radiant-event-binding-lab.script';
import './components/radiant-context-flow-shell.script';
import './components/radiant-signal-release-board.script';
import './components/radiant-slot-studio-board.script.tsx';
import './style.css';
import { createRoot } from '@ecopages/jsx';
import { App } from './app';

const root = createRoot(document.getElementById('app')!);
root.hydrate(<App />);
startControllers(document);
