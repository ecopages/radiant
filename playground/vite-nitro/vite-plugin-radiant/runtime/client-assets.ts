import type { RenderedComponentAsset } from '@ecopages/radiant/server/render-component';
import { loadRadiantClientModule } from 'virtual:radiant/client-module-registry';
import type { RadiantDocumentUsage } from './document-state';

export async function ensureRadiantAssets({
	assets,
	usage,
}: {
	assets: readonly RenderedComponentAsset[];
	usage?: Partial<RadiantDocumentUsage>;
}) {
	for (const asset of assets) {
		switch (asset.kind) {
			case 'script-module':
				await loadRadiantClientModule(asset.src);
				break;
			case 'modulepreload':
				ensureHeadLink('modulepreload', asset.href);
				break;
			case 'style':
				ensureStylesheet(asset.href, asset.media);
				break;
		}
	}

	await ensureDefinedCustomElements(usage?.customElementTagNames ?? []);
}

async function ensureDefinedCustomElements(tagNames: readonly string[]) {
	for (const tagName of tagNames) {
		if (!tagName.includes('-')) {
			continue;
		}

		if (!customElements.get(tagName)) {
			throw new Error(`Missing client module for ${tagName}.`);
		}

		await customElements.whenDefined(tagName);
	}
}

function ensureHeadLink(rel: string, href: string) {
	const head = document.head;
	if (head.querySelector(`link[rel="${CSS.escape(rel)}"][href="${CSS.escape(href)}"]`)) {
		return;
	}

	const link = document.createElement('link');
	link.rel = rel;
	link.href = href;
	head.append(link);
}

function ensureStylesheet(href: string, media?: string) {
	const head = document.head;
	const escapedHref = CSS.escape(href);
	const selector = media
		? `link[rel="stylesheet"][href="${escapedHref}"][media="${CSS.escape(media)}"]`
		: `link[rel="stylesheet"][href="${escapedHref}"]`;

	if (head.querySelector(selector)) {
		return;
	}

	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = href;
	if (media) {
		link.media = media;
	}
	head.append(link);
}
