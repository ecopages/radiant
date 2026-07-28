import type { JsxRenderable } from '@ecopages/jsx';
import {
	ClientStateSection,
	HeroSection,
	NitroRouteSection,
	RadiantElementLabSection,
	SsrRouteSection,
} from './components/playground-sections';

export type AppProps = {
	bootstrapStateScript?: JsxRenderable;
	documentStateScript?: JsxRenderable;
};

export function App({ bootstrapStateScript, documentStateScript }: AppProps = {}) {
	return (
		<main class="shell">
			{documentStateScript}
			{bootstrapStateScript}
			<HeroSection />
			<RadiantElementLabSection />
			<SsrRouteSection />
			<ClientStateSection />
			<NitroRouteSection />
		</main>
	);
}
