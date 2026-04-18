import type { EcoComponent } from '@ecopages/core';

export const WeatherApp: EcoComponent = () => <radiant-weather-app />;

WeatherApp.config = {
	dependencies: {
		scripts: ['./weather-app.script.tsx'],
	},
};
