import { RadiantElement, customElement, onEvent, query } from '@ecopages/radiant';
import { installStandIn } from './agent-tools.stand-in';
import { resolveToolSource, type ToolSource } from './agent-tools.tool-source';

installStandIn();

/**
 * Lists the tools the page has registered and calls one the way an agent would. Docs-only: it is not part of the
 * recipe. It reads tools from the stand-in, or from the browser's WebMCP testing surface where the browser has its
 * own `document.modelContext`.
 */
@customElement('tool-inspector')
export class ToolInspector extends RadiantElement {
	@query('ul') private list!: HTMLElement;
	@query('[data-result]') private result!: HTMLElement;
	@query('textarea') private input!: HTMLTextAreaElement;
	private source: ToolSource | undefined;

	override onConnected(): void {
		this.source = resolveToolSource();
		if (!this.source) {
			this.list.replaceChildren(
				this.note(
					'This browser has WebMCP but does not let a page read its tools back. Open DevTools, Application, WebMCP to see them.',
				),
			);
			return;
		}
		const show = () => this.show();
		this.registerCleanupCallback(this.source.subscribe(show));
		this.show();
	}

	private note(text: string): HTMLElement {
		return Object.assign(document.createElement('li'), { textContent: text, className: 'empty' });
	}

	private show(): void {
		const names = this.source?.names() ?? [];
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
				: [this.note('No tools registered')]),
		);
	}

	@onEvent({ selector: '[data-call]', type: 'click' })
	async call(event: Event): Promise<void> {
		const name = (event.target as HTMLElement).dataset.call!;
		try {
			const result = await this.source!.call(name, JSON.parse(this.input.value));
			this.result.textContent = JSON.stringify(result);
		} catch (error) {
			this.result.textContent = `${error instanceof Error ? error.name : 'Error'}: ${error instanceof Error ? error.message : String(error)}`;
		}
	}
}
