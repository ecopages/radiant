import { RadiantElement, customElement, onEvent, query } from '@ecopages/radiant';
import { installStandIn } from './agent-tools.stand-in';

const standIn = installStandIn();

/**
 * Lists the tools the page has registered and calls one the way an agent would. Docs-only: it is not part of the
 * recipe, and it can list tools only on the stand-in, because a browser's own `document.modelContext` does not
 * let a page read its tools back.
 */
@customElement('tool-inspector')
export class ToolInspector extends RadiantElement {
	@query('ul') private list!: HTMLElement;
	@query('[data-result]') private result!: HTMLElement;
	@query('textarea') private input!: HTMLTextAreaElement;

	override onConnected(): void {
		if (!standIn) {
			this.result.textContent = 'This browser has WebMCP. Open DevTools, Application, WebMCP to see the tools.';
			return;
		}
		const show = () => this.show();
		standIn.addEventListener('toolchange', show);
		this.registerCleanupCallback(() => standIn.removeEventListener('toolchange', show));
		this.show();
	}

	private show(): void {
		const names = [...(standIn?.tools.keys() ?? [])];
		this.list.replaceChildren(
			...(names.length > 0
				? names.map((name) => {
						const item = document.createElement('li');
						const button = document.createElement('button');
						button.type = 'button';
						button.dataset.call = name;
						button.textContent = `Call ${name}`;
						item.append(button);
						return item;
					})
				: [
						Object.assign(document.createElement('li'), {
							textContent: 'No tools registered',
							className: 'empty',
						}),
					]),
		);
	}

	@onEvent({ selector: '[data-call]', type: 'click' })
	async call(event: Event): Promise<void> {
		const name = (event.target as HTMLElement).dataset.call!;
		try {
			const result = await standIn!.tools
				.get(name)!
				.execute(JSON.parse(this.input.value), { signal: new AbortController().signal });
			this.result.textContent = JSON.stringify(result);
		} catch (error) {
			this.result.textContent = `${error instanceof Error ? error.name : 'Error'}: ${error instanceof Error ? error.message : String(error)}`;
		}
	}
}
