import { unsafeHtml } from '@ecopages/jsx';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { DocsCanvasElement } from '../src/components/component-docs/canvas.script';
import { DocsDemoElement } from '../src/components/component-docs/demo.script';
import { meta as toastMeta } from '../src/content/stories/toast';
import { clearDocsStories, docsStory, type DocsMeta, type DocsStory } from '../src/lib/docs-stories';

type CanvasArgs = { label: string };

const storyId = 'test/canvas';

const meta = {
	args: { label: 'Client render' },
	render: (args) => unsafeHtml(`<p data-canvas-story>${args.label}</p>`),
} satisfies DocsMeta<CanvasArgs>;

const story: DocsStory<CanvasArgs> = {
	parameters: { docs: { id: storyId } },
};

describe('DocsCanvasElement', () => {
	beforeEach(() => {
		clearDocsStories();
		docsStory(meta, story);
	});

	afterEach(() => {
		document.body.replaceChildren();
		clearDocsStories();
	});

	test('preserves SSR content during upgrade and re-renders it when args change', () => {
		const demo = document.createElement('radiant-docs-demo') as DocsDemoElement;
		demo.dataset.storyId = storyId;

		const canvas = document.createElement('radiant-docs-canvas') as DocsCanvasElement;
		canvas.dataset.storyId = storyId;
		const mount = document.createElement('div');
		mount.dataset.docsPreview = '';
		const ssrContent = document.createElement('p');
		ssrContent.textContent = 'Server render';
		mount.append(ssrContent);
		canvas.append(mount);
		demo.append(canvas);
		document.body.append(demo);

		expect(mount.firstElementChild).toBe(ssrContent);

		demo.story.setContext({ args: { label: 'Updated render' }, renderRevision: 1 });
		canvas.repaintFromContext();
		canvas.repaintFromContext();

		expect(canvas.querySelector('[data-canvas-story]')?.textContent).toBe('Updated render');
	});

	test('repaints toast playground previews on client connect', async () => {
		const toastStoryId = 'toast/default';
		docsStory(toastMeta, { parameters: { docs: { id: toastStoryId } } });

		const demo = document.createElement('radiant-docs-demo') as DocsDemoElement;
		demo.dataset.storyId = toastStoryId;

		const canvas = document.createElement('radiant-docs-canvas') as DocsCanvasElement;
		canvas.dataset.storyId = toastStoryId;
		const mount = document.createElement('div');
		mount.dataset.docsPreview = '';
		mount.innerHTML = '<div class="playground-toast-stage"></div>';
		canvas.append(mount);
		demo.append(canvas);
		document.body.append(demo);

		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

		expect(canvas.querySelector('.playground-toast-stage__actions button')).not.toBeNull();
		expect(canvas.querySelector('rui-toaster')).not.toBeNull();
	});

	test('remounts preview after the story removes itself from the canvas', () => {
		const demo = document.createElement('radiant-docs-demo') as DocsDemoElement;
		demo.dataset.storyId = storyId;

		const canvas = document.createElement('radiant-docs-canvas') as DocsCanvasElement;
		canvas.dataset.storyId = storyId;
		const mount = document.createElement('div');
		mount.dataset.docsPreview = '';
		canvas.append(mount);
		demo.append(canvas);
		document.body.append(demo);

		demo.story.setContext({ storyId, args: { label: 'Live preview' }, renderRevision: 1 });
		canvas.repaintFromContext();
		expect(canvas.querySelector('[data-canvas-story]')?.textContent).toBe('Live preview');

		canvas.querySelector('[data-canvas-story]')?.remove();
		expect(canvas.querySelector('[data-canvas-story]')).toBeNull();

		demo.story.setContext({ storyId, args: { label: 'Live preview' }, renderRevision: 2 });
		canvas.repaintFromContext();

		expect(canvas.querySelector('[data-canvas-story]')?.textContent).toBe('Live preview');
	});
});
