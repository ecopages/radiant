import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import './weather-app.script';

export const WeatherApp = eco.component<{}, JsxRenderable>({
	dependencies: {
		scripts: ['./weather-app.script.tsx'],
	},
	render: () => <radiant-weather-app></radiant-weather-app>,
});
