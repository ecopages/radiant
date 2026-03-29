/** @jsxImportSource @ecopages/jsx */

import { type ContextProvider, RadiantElement, consumeContext, customElement, onEvent, prop } from '@ecopages/radiant';
import { todoContext } from './todo-context';

export type RadiantTodoProps = {
	complete?: boolean;
};

@customElement('radiant-todo-item')
export class RadiantTodoItem extends RadiantElement {
	@prop({ type: Boolean, reflect: true, defaultValue: false }) declare complete: boolean;
	@consumeContext(todoContext) context!: ContextProvider<typeof todoContext>;

	@onEvent({ selector: 'input[type="checkbox"]', type: 'change' })
	toggleComplete(event: Event) {
		const checkbox = event.target as HTMLInputElement;
		this.complete = checkbox.checked;
		const currentContext = this.context.getContext();
		const nextTodos = currentContext.todos.map((todo) =>
			todo.id === this.id ? { ...todo, complete: checkbox.checked } : todo,
		);

		this.context.setContext({ todos: nextTodos });
		currentContext.logger.log(`Todo ${this.id} is now ${checkbox.checked ? 'complete' : 'incomplete'}`);
	}

	@onEvent({ ref: 'remove-todo', type: 'click' })
	removeTodo() {
		const currentContext = this.context.getContext();
		const nextTodos = currentContext.todos.filter((todo) => todo.id !== this.id);

		this.context.setContext({ todos: nextTodos });
		currentContext.logger.log(`Todo ${this.id} removed`);
	}
}