import type { JsxRenderable } from '@ecopages/jsx';
import {
	ClientStateSection,
	HeroSection,
	NitroRouteSection,
	RadiantElementLabSection,
	SsrRouteSection,
} from './components/playground-sections';

export type AppProps = {
	ssrPreviewContent?: JsxRenderable;
	bootstrapStateScript?: JsxRenderable;
	documentStateScript?: JsxRenderable;
};

export function App({ ssrPreviewContent, bootstrapStateScript, documentStateScript }: AppProps = {}) {
	return (
		<main class="shell">
			{documentStateScript}
			{bootstrapStateScript}
			<HeroSection />
			<RadiantElementLabSection />
			<SsrRouteSection ssrPreviewContent={ssrPreviewContent} />
			<ClientStateSection />
			<NitroRouteSection />
		</main>
	);
}
