import {
	RadiantElement,
	customElement,
	onEvent,
	prop,
} from '@ecopages/radiant';
import { type ContextProvider, consumeContext, contextSelector, provideContext } from '@ecopages/radiant/context';
import { TodoLogger, todoContext, type Todo, type TodoContext } from './todo-context';

export type RadiantTodoProps = {
	complete?: boolean;
	text?: string;
};

type RadiantTodoBindings = {
	complete: boolean;
	text: string;
};

@customElement('radiant-todo-item')
export class RadiantTodoItem extends RadiantElement<RadiantTodoBindings> {
	@prop({ type: Boolean, reflect: true, defaultValue: false }) declare complete: boolean;
	@prop({ type: String, defaultValue: '' }) declare text: string;
	@consumeContext(todoContext) context!: ContextProvider<typeof todoContext>;

	private getInputId() {
		return `todo-${this.id}`;
	}

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

	override render() {
		return (
			<>
				<label for={this.getInputId()}>
					<input id={this.getInputId()} name={this.id} type="checkbox" checked={this.$.complete} />
					{this.$.text}
				</label>
				<button
					type="button"
					data-ref="remove-todo"
					aria-label={`Remove todo: ${this.id}`}
					class="todo__item-remove"
				>
					<svg
						width="20"
						height="20"
						aria-hidden="true"
						focusable="false"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="pointer-events-none"
					>
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</button>
			</>
		);
	}
}

@customElement('radiant-todo-app')
export class RadiantTodoAppElement extends RadiantElement {
	@provideContext<typeof todoContext>({
		context: todoContext,
		initialValue: { todos: [], logger: new TodoLogger() },
		hydrate: Object,
		serialize: ({ todos }: TodoContext) => ({ todos }),
	})
	provider!: ContextProvider<typeof todoContext>;

	@contextSelector({ context: todoContext, select: ({ todos }) => todos })
	todos: Todo[] = [];

	@onEvent({ selector: 'form', type: 'submit' })
	submitTodo(event: FormDataEvent) {
		event.preventDefault();
		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		const todo = formData.get('todo');

		if (todo) {
			const currentContext = this.provider.getContext();
			const nextTodos = [
				...currentContext.todos,
				{ id: Date.now().toString(), text: todo.toString(), complete: false },
			];

			currentContext.logger.log(`Todo added: ${todo.toString()}`);
			this.provider.setContext({ todos: nextTodos });
			form.reset();
		}
	}

	renderTodoList({ todos }: { todos: Todo[] }) {
		return todos.map(({ id, complete, text }) => (
			<radiant-todo-item complete={complete} class="todo__item" id={id} text={text} />
		));
	}

	override render() {
		const todos = this.todos;
		const todosCompleted = todos.filter((todo) => todo.complete);
		const todosIncomplete = todos.filter((todo) => !todo.complete);

		return (
			<>
				<section class="todo__board">
					<article class="todo__panel">
						<h2>Incomplete Todos</h2>
						<p class="todo__count">
							Incomplete Todos: <span data-ref="count-incomplete">{todosIncomplete.length}</span>
						</p>
						<div class="todo__list" data-ref="list-incomplete">
							{todosIncomplete.length > 0 ? (
								this.renderTodoList({ todos: todosIncomplete })
							) : (
								<div>No todos to show</div>
							)}
						</div>
					</article>
					<article class="todo__panel">
						<h2>Completed Todos</h2>
						<p class="todo__count">
							Completed Todos: <span data-ref="count-complete">{todosCompleted.length}</span>
						</p>
						<div class="todo__list" data-ref="list-complete">
							{todosCompleted.length > 0 ? (
								this.renderTodoList({ todos: todosCompleted })
							) : (
								<div>No completed todos to show</div>
							)}
						</div>
					</article>
				</section>
				<form>
					<div class="form-group">
						<label for="new-todo">Add Todo</label>
						<input id="new-todo" name="todo" />
					</div>
					<button type="submit">Add</button>
				</form>
			</>
		);
	}
}
