import { RadiantElement, customElement, onEvent, query } from '@ecopages/radiant';
import { agentTool } from '@ecopages/radiant/decorators/agent-tool';
import { z } from 'zod';

const AddItem = z.object({ sku: z.string().min(1).describe('The product to add, by its SKU') });

@customElement('agent-tools-element')
export class AgentToolsElement extends RadiantElement {
	@query('input') private input!: HTMLInputElement;
	@query('ul') private list!: HTMLElement;
	@query('[data-status]') private status!: HTMLElement;

	@onEvent({ selector: 'form', type: 'submit' })
	submit(event: SubmitEvent): void {
		event.preventDefault();
		this.addItem({ sku: this.input.value });
	}

	@agentTool({
		name: 'add_to_cart',
		description: 'Adds a product to the cart by its SKU.',
		annotations: { consequentialHint: false },
		inputSchema: z.toJSONSchema(AddItem),
		parse: (input) => AddItem.parse(input),
	})
	addItem({ sku }: z.infer<typeof AddItem>) {
		const item = document.createElement('li');
		item.textContent = sku;
		this.list.append(item);
		const count = this.list.children.length;
		this.status.textContent = `${count} in cart`;
		return { count };
	}
}
