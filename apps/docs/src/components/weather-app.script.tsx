import {
	type ContextProvider,
	RadiantComponent,
	contextSelector,
	createContext,
	customElement,
	provideContext,
	state,
} from '@ecopages/radiant';
import { asyncState, state as signalState } from '@ecopages/signals';
import type { WeatherCity, WeatherContext, WeatherReport, WeatherSummaryBindings } from './weather-app.types';
import {
	DEFAULT_CITY_ID,
	WEATHER_CITIES,
	fetchWeatherReport,
	getWeatherButtonClass,
	getWeatherCity,
	upsertWeatherReport,
} from './weather-app.utils';

const weatherContext = createContext<WeatherContext>(Symbol('weather-context'));

@customElement('radiant-weather-summary')
export class RadiantWeatherSummary extends RadiantComponent<WeatherSummaryBindings> {
	@state city = getWeatherCity(DEFAULT_CITY_ID).label;
	@state condition = '';
	@state humidity = 0;
	@state summary = '';
	@state temperature = 0;
	@state windKph = 0;

	@contextSelector({
		context: weatherContext,
		select: ({ activeCityId, reports }) => reports.find((report) => report.cityId === activeCityId),
	})
	syncSelectedReport(report?: WeatherReport) {
		if (!report) {
			return;
		}

		this.city = report.city;
		this.condition = report.condition;
		this.humidity = report.humidity;
		this.summary = report.summary;
		this.temperature = report.temperature;
		this.windKph = report.windKph;
	}

	override render() {
		return (
			<article
				class="grid gap-3 rounded-sm border border-border bg-secondary-container/20 p-4"
				data={{ city: this.$.city }}
			>
				<div class="flex items-start justify-between gap-3">
					<div class="grid gap-1">
						<p class="text-sm font-semibold text-on-background">{this.$.city}</p>
						<p class="text-sm text-on-background/70">{this.$.condition}</p>
					</div>
					<p class="text-3xl font-semibold text-on-background">
						{this.$.temperature}
						<span class="text-base font-medium text-on-background/70">°C</span>
					</p>
				</div>
				<p class="text-sm leading-6 text-on-background/80">{this.$.summary}</p>
				<dl class="grid grid-cols-2 gap-3 text-sm text-on-background/70">
					<div class="grid gap-1 rounded-sm border border-border/60 bg-background/60 p-3">
						<dt>Humidity</dt>
						<dd class="font-medium text-on-background">{this.$.humidity}%</dd>
					</div>
					<div class="grid gap-1 rounded-sm border border-border/60 bg-background/60 p-3">
						<dt>Wind</dt>
						<dd class="font-medium text-on-background">{this.$.windKph} km/h</dd>
					</div>
				</dl>
			</article>
		);
	}
}

@customElement('radiant-weather-app')
export class RadiantWeatherAppElement extends RadiantComponent {
	private activeCityId = signalState(DEFAULT_CITY_ID);

	private weatherQuery = asyncState({
		pendingDelay: 500,
		staleTime: 1 * 60 * 1000,
		source: () => this.activeCityId.get(),
		fetcher: (cityId, { signal }) => fetchWeatherReport(getWeatherCity(cityId), signal),
		onSuccess: (report) => {
			this.provider.setContext({
				activeCityId: report.cityId,
				reports: upsertWeatherReport(this.provider.getContext().reports, report),
			});
		},
	});

	@provideContext<typeof weatherContext>({
		context: weatherContext,
		initialValue: {
			activeCityId: DEFAULT_CITY_ID,
			reports: [],
		},
	})
	provider!: ContextProvider<typeof weatherContext>;

	override disconnectedCallback(): void {
		this.weatherQuery.dispose();
		super.disconnectedCallback();
	}

	private readonly handleCityClick = (event: Event) => {
		const button = event.currentTarget as HTMLButtonElement | null;
		const cityId = button?.dataset.cityId;

		if (!cityId) {
			return;
		}

		this.activeCityId.set(cityId);
		this.provider.setContext({ activeCityId: cityId });
	};

	private getStatusMessage(status: string, activeCity: WeatherCity, activeReport?: WeatherReport, error?: unknown) {
		if (status === 'pending') {
			return `Loading ${activeCity.label} from Open-Meteo...`;
		}

		if (status === 'error') {
			return `Unable to load ${activeCity.label}: ${String(error)}`;
		}

		if (activeReport) {
			return `Live conditions for ${activeReport.city} via Open-Meteo.`;
		}

		return 'Pick a city to load the current forecast.';
	}

	private getEmptyStateMessage(status: string, activeCity: WeatherCity) {
		if (status === 'error') {
			return 'The summary is unavailable until a city forecast resolves successfully.';
		}

		return `Waiting for ${activeCity.label} to resolve...`;
	}

	private renderSummaryCard(
		visibleReport: WeatherReport | undefined,
		isPending: boolean,
		status: string,
		activeCity: WeatherCity,
	) {
		if (!visibleReport) {
			return (
				<div class="grid min-h-52 place-items-center rounded-sm border border-dashed border-border/70 bg-secondary-container/10 p-4 text-sm text-on-background/70">
					{this.getEmptyStateMessage(status, activeCity)}
				</div>
			);
		}

		return (
			<div class={{ 'transition-opacity': true, 'opacity-50': isPending }}>
				<radiant-weather-summary />
			</div>
		);
	}

	private renderPendingOverlay(isPending: boolean, activeCity: WeatherCity) {
		if (!isPending) {
			return null;
		}

		return (
			<div
				aria-live="polite"
				class="absolute inset-0 grid place-items-center rounded-sm bg-background/70 backdrop-blur-[1px]"
			>
				<div class="flex items-center gap-3 rounded-sm border border-border bg-background px-4 py-3 text-sm font-medium text-on-background shadow-sm">
					<span class="size-3 rounded-full bg-primary animate-pulse" />
					<span>Loading {activeCity.label}...</span>
				</div>
			</div>
		);
	}

	override render() {
		const status = this.weatherQuery.status.get();
		const error = this.weatherQuery.error.get();
		const lastResolvedReport = this.weatherQuery.data.get();
		const { activeCityId, reports } = this.provider.getContext();
		const activeCity = getWeatherCity(activeCityId);
		const activeReport = reports.find((report) => report.cityId === activeCityId);
		const visibleReport = activeReport ?? lastResolvedReport;
		const isPending = status === 'pending';
		const statusMessage = this.getStatusMessage(status, activeCity, activeReport, error);

		return (
			<section class="grid gap-4 rounded-sm border border-border bg-background p-4 text-on-background">
				<div class="grid gap-2">
					<p class="text-sm font-semibold">Weather</p>
					<p class="text-sm text-on-background/70">
						The host fetches each city from Open-Meteo on connect and on click. The summary subscribes to
						the selected report through context.
					</p>
				</div>
				<p class="text-sm text-on-background/70" data-status={status}>
					{statusMessage}
				</p>
				<div class="flex flex-wrap gap-2">
					{WEATHER_CITIES.map((city) => (
						<button
							type="button"
							data={{ cityId: city.id }}
							on:click={this.handleCityClick}
							aria={{ pressed: city.id === activeCityId }}
							class={getWeatherButtonClass(city.id === activeCityId)}
						>
							{city.label}
						</button>
					))}
				</div>
				<div class="relative">
					{this.renderSummaryCard(visibleReport, isPending, status, activeCity)}
					{this.renderPendingOverlay(isPending, activeCity)}
				</div>
			</section>
		);
	}
}
