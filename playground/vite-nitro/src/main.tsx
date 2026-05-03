import { App } from './app';
import { startRadiantApp } from '../vite-plugin-radiant/runtime/index';
import './style.css';

void startRadiantApp({ app: () => <App /> });
