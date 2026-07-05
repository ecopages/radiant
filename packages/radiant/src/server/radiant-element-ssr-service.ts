import type { JsxRenderable } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import { getCustomElementTagName } from '../core/custom-element-metadata';
import { withSsrContextProviders } from './context-ssr';
import { composeHostContent } from './host-script-composition';
import { resolveHostAttributes, stringifyHostAttributes } from './host-attribute-serialization';
import { ensureLegacyHostReady } from '../decorators/legacy/host-readiness';
import { toInternalRadiantSsrHost } from './radiant-element-ssr-extractor';
import type { InternalRadiantSsrHost } from '../core/radiant-element-ssr-host';

export class RadiantElementSsrService {
	private readonly component: object;
	private readonly host: InternalRadiantSsrHost;

	constructor(component: object) {
		this.component = component;
		this.host = toInternalRadiantSsrHost(component);
	}

	private ensureReady(): void {
		ensureLegacyHostReady(this.component, 'ssr');
	}

	public renderHost(): JsxRenderable {
		this.ensureReady();

		return {
			nodeType: 1,
			outerHTML: this.renderHostToString({ mode: 'hydrate' }),
		};
	}

	public renderHostToString(options: RenderToStringOptions = {}, attributes = this.getHostAttributes()): string {
		this.ensureReady();
		const tagName = this.getTagName();
		const restoreSsrContexts = withSsrContextProviders(this.host.getContextProviders());

		try {
			return `<${tagName}${stringifyHostAttributes(attributes)}>${this.renderHostContent(options)}</${tagName}>`;
		} finally {
			restoreSsrContexts();
		}
	}

	public getHostAttributes(): Record<string, string> {
		this.ensureReady();
		return resolveHostAttributes(this.host);
	}

	private renderHostContent(options: RenderToStringOptions): string {
		const hydrate = options.mode === 'hydrate' || (options.mode === undefined && options.hydrate === true);

		const hydrationScripts = hydrate
			? this.host
					.getHydrationBindings()
					.map((binding) => binding.renderHydrationScriptTag())
					.filter((markup): markup is string => typeof markup === 'string')
					.join('')
			: '';

		return composeHostContent(
			{
				hostContent: this.host.renderViewToString(options),
				authoredHydrationMarkup: this.host.getAuthoredHydrationScriptMarkup?.() ?? '',
				slotProjectionScript: this.host.getSlotProjectionScriptTag?.() ?? '',
				hydrationScripts,
			},
			hydrate,
		);
	}

	private getTagName(): string {
		const tagName = getCustomElementTagName(this.host.constructor);

		if (!tagName) {
			throw new Error(`${this.host.constructor.name} is missing @customElement metadata.`);
		}

		return tagName;
	}
}
