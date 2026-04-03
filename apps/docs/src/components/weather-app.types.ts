export type WeatherCity = {
	id: string;
	label: string;
	latitude: number;
	longitude: number;
};

export type WeatherReport = {
	cityId: string;
	city: string;
	condition: string;
	summary: string;
	temperature: number;
	humidity: number;
	windKph: number;
};

export type WeatherContext = {
	activeCityId: string;
	reports: WeatherReport[];
};

export type WeatherSummaryBindings = {
	city: string;
	condition: string;
	humidity: number;
	summary: string;
	temperature: number;
	windKph: number;
};

export type OpenMeteoResponse = {
	current?: {
		temperature_2m: number;
		relative_humidity_2m: number;
		wind_speed_10m: number;
		weather_code: number;
		is_day: number;
	};
};
