import { RadiantElement, customElement, onEvent, query } from '@ecopages/radiant';
import { createRovingController } from '@ecopages/radiant-ui/controllers';
import { textContains } from '@ecopages/radiant-ui/helpers';

@customElement('searchable-list-element')
export class SearchableListElement extends RadiantElement {
	@query('input') private input!: HTMLInputElement;
	@query('ul') private list!: HTMLElement;
	@query('[data-status]') private status!: HTMLElement;

	private readonly roving = createRovingController(this, {
		getItems: () => this.visible,
		getTarget: () => this.list,
		orientation: 'vertical',
		wrap: false,
	});

	private get all(): HTMLElement[] {
		return [...this.list.children] as HTMLElement[];
	}

	private get visible(): HTMLElement[] {
		return this.all.filter((item) => !item.hidden);
	}

	override onConnected(): void {
		this.roving.sync();
	}

	@onEvent({ selector: 'input', type: 'input' })
	filter(): void {
		for (const item of this.all) {
			item.hidden = !textContains(item.textContent, this.input.value);
		}
		this.roving.sync();
		const shown = this.visible.length;
		this.status.textContent = shown === 0 ? 'No matches' : `${shown} of ${this.all.length} shown`;
	}

	@onEvent({ selector: 'input', type: 'keydown' })
	enterList(event: KeyboardEvent): void {
		const first = this.visible[0];
		if (event.key === 'ArrowDown' && first) {
			event.preventDefault();
			this.roving.focus(first);
		}
	}

	@onEvent({ selector: 'ul', type: 'keydown' })
	choose(event: KeyboardEvent): void {
		if (event.key === 'Enter' && event.target instanceof HTMLElement) {
			this.status.textContent = `Chose ${event.target.textContent}`;
		}
	}
}
