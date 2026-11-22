import { registerAgentTool } from '@ecopages/radiant/helpers/register-agent-tool';
import { z } from 'zod';
import { mountExample } from '../../../components/primitive-example/mount-example';

const AddItem = z.object({ sku: z.string().min(1).describe('The product to add, by its SKU') });

export function mount(root: HTMLElement): () => void {
	const form = root.querySelector('form')!;
	const input = root.querySelector('input')!;
	const list = root.querySelector('ul')!;
	const status = root.querySelector('[data-status]')!;

	const addItem = ({ sku }: z.infer<typeof AddItem>) => {
		const item = document.createElement('li');
		item.textContent = sku;
		list.append(item);
		const count = list.children.length;
		status.textContent = `${count} in cart`;
		return { count };
	};

	const unregister = registerAgentTool({
		name: 'add_to_cart',
		description: 'Adds a product to the cart by its SKU.',
		annotations: { consequentialHint: false },
		inputSchema: z.toJSONSchema(AddItem),
		parse: (value) => AddItem.parse(value),
		execute: addItem,
	});

	const submit = (event: SubmitEvent) => {
		event.preventDefault();
		addItem({ sku: input.value });
	};
	form.addEventListener('submit', submit);

	return () => {
		form.removeEventListener('submit', submit);
		unregister();
	};
}

mountExample('agent-tools', mount);
