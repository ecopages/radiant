import { App } from './app';
import { bootstrapClientApp } from './bootstrap-client';
import { startRadiantApp } from '@ecopages/vite-plugin-radiant/runtime';
import './style.css';

void startRadiantApp({
	app: (props) => <App {...props} />,
	bootstrap: () => bootstrapClientApp(),
});
