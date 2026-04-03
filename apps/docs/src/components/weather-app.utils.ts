import type { OpenMeteoResponse, WeatherCity, WeatherReport } from './weather-app.types';

const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

export const WEATHER_CITIES: WeatherCity[] = [
	{ id: 'venice', label: 'Venice', latitude: 45.4372, longitude: 12.3346 },
	{ id: 'madrid', label: 'Madrid', latitude: 40.4168, longitude: -3.7038 },
	{ id: 'barcelona', label: 'Barcelona', latitude: 41.3874, longitude: 2.1686 },
	{ id: 'new-york', label: 'New York', latitude: 40.7128, longitude: -74.006 },
	{ id: 'tokio', label: 'Tokio', latitude: 35.6764, longitude: 139.65 },
	{ id: 'sf', label: 'SF', latitude: 37.7749, longitude: -122.4194 },
];

export const DEFAULT_CITY_ID = WEATHER_CITIES[0].id;

export const getWeatherCity = (cityId: string) =>
	WEATHER_CITIES.find((city) => city.id === cityId) ?? WEATHER_CITIES[0];

export const getWeatherButtonClass = (isActive: boolean) => {
	if (isActive) {
		return 'button button--sm button--primary';
	}

	return 'button button--sm button--outline';
};

export const upsertWeatherReport = (reports: WeatherReport[], nextReport: WeatherReport) => {
	const reportIndex = reports.findIndex((report) => report.cityId === nextReport.cityId);

	if (reportIndex === -1) {
		return [...reports, nextReport];
	}

	return reports.map((report, index) => (index === reportIndex ? nextReport : report));
};

const buildWeatherApiUrl = (city: WeatherCity) => {
	const searchParams = new URLSearchParams({
		latitude: String(city.latitude),
		longitude: String(city.longitude),
		current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
		temperature_unit: 'celsius',
		wind_speed_unit: 'kmh',
		timezone: 'auto',
		forecast_days: '1',
	});

	return `${WEATHER_API_URL}?${searchParams.toString()}`;
};

const getWeatherCondition = (weatherCode: number) => {
	if (weatherCode === 0) {
		return 'Clear';
	}

	if (weatherCode === 1 || weatherCode === 2) {
		return 'Partly cloudy';
	}

	if (weatherCode === 3) {
		return 'Overcast';
	}

	if (weatherCode === 45 || weatherCode === 48) {
		return 'Fog';
	}

	if ([51, 53, 55, 56, 57].includes(weatherCode)) {
		return 'Drizzle';
	}

	if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
		return 'Rain';
	}

	if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
		return 'Snow';
	}

	if ([95, 96, 99].includes(weatherCode)) {
		return 'Thunderstorm';
	}

	return 'Mixed';
};

const getHumidityLine = (humidity: number) => {
	if (humidity >= 75) {
		return 'Humidity stays high.';
	}

	if (humidity <= 40) {
		return 'Air stays dry.';
	}

	return 'Humidity stays moderate.';
};

const getWindLine = (windKph: number) => {
	if (windKph >= 24) {
		return 'Winds push through at a quick pace.';
	}

	if (windKph >= 14) {
		return 'A steady breeze moves through the city.';
	}

	return 'Winds stay fairly light.';
};

const getDaylightLine = (isDay: number) => {
	if (isDay === 1) {
		return 'Daylight keeps the streets bright.';
	}

	return 'Evening light flattens the skyline a bit.';
};

const createWeatherSummary = (condition: string, humidity: number, windKph: number, isDay: number) => {
	const humidityLine = getHumidityLine(humidity);
	const windLine = getWindLine(windKph);
	const daylightLine = getDaylightLine(isDay);

	return `${condition} holds for now. ${humidityLine} ${windLine} ${daylightLine}`;
};

export const fetchWeatherReport = async (city: WeatherCity, signal: AbortSignal): Promise<WeatherReport> => {
	const response = await fetch(buildWeatherApiUrl(city), { signal });

	if (!response.ok) {
		throw new Error(`Request failed with ${response.status}`);
	}

	const payload = (await response.json()) as OpenMeteoResponse;
	const current = payload.current;

	if (!current) {
		throw new Error('Current conditions were unavailable');
	}

	const humidity = Math.round(current.relative_humidity_2m);
	const windKph = Math.round(current.wind_speed_10m);
	const condition = getWeatherCondition(current.weather_code);

	return {
		cityId: city.id,
		city: city.label,
		condition,
		summary: createWeatherSummary(condition, humidity, windKph, current.is_day),
		temperature: Math.round(current.temperature_2m),
		humidity,
		windKph,
	};
};
