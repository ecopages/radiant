import { App } from './app';
import { bootstrapClientApp } from './bootstrap-client';
import { startRadiantApp } from '../vite-plugin-radiant/runtime/index';
import './style.css';

void startRadiantApp({
	app: (props) => <App {...props} />,
	bootstrap: () => bootstrapClientApp(),
});
