import type { EcoComponent } from '@ecopages/core';
import './weather-app.script';

export const WeatherApp: EcoComponent = () => <radiant-weather-app></radiant-weather-app>;

WeatherApp.config = {
	dependencies: {
		scripts: ['./weather-app.script.tsx'],
	},
};
