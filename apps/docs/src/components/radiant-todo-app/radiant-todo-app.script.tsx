/** @jsxImportSource @ecopages/jsx */

import {
	type ContextProvider,
	RadiantComponent,
	contextSelector,
	customElement,
	onEvent,
	provideContext,
} from '@ecopages/radiant';
import './radiant-todo-item.script';
import { createTodoSamples, TodoLogger, todoContext, type Todo, type TodoContext } from './todo-context';

const NoTodosMessage = () => {
	return <div>No todos to show</div>;
};

const NoCompletedTodosMessage = () => {
	return <div>No completed todos to show</div>;
};

const TodoItem = ({ id, complete, text }: Todo) => {
	return (
		<radiant-todo-item complete={complete} class="todo__item" id={id}>
			<label for={`todo-${id}`}>
				<input id={`todo-${id}`} name={id} type="checkbox" checked={complete} />
				{text}
			</label>
			<button type="button" data-ref="remove-todo" aria-label={`Remove todo: ${id}`} class="todo__item-remove">
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
		</radiant-todo-item>
	);
};

const TodoList = ({ todos }: { todos: Todo[] }) => {
	return (
		<>
			{todos.map((todo) => (
				<TodoItem {...todo} />
			))}
		</>
	);
};

@customElement('radiant-todo-app')
export class RadiantTodoAppElement extends RadiantComponent {
	@provideContext<typeof todoContext>({
		context: todoContext,
		initialValue: { todos: [], logger: new TodoLogger() },
		hydrate: Object,
		serialize: ({ todos }: TodoContext) => ({ todos }),
	})
	provider!: ContextProvider<typeof todoContext>;

	@contextSelector({ context: todoContext, select: ({ todos }) => todos })
	onProvidedTodosChanged() {
		this.requestUpdate();
	}

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

	override render() {
		const todos = this.provider.getContext().todos;
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
							{todosIncomplete.length > 0 ? <TodoList todos={todosIncomplete} /> : <NoTodosMessage />}
						</div>
					</article>
					<article class="todo__panel">
						<h2>Completed Todos</h2>
						<p class="todo__count">
							Completed Todos: <span data-ref="count-complete">{todosCompleted.length}</span>
						</p>
						<div class="todo__list" data-ref="list-complete">
							{todosCompleted.length > 0 ? (
								<TodoList todos={todosCompleted} />
							) : (
								<NoCompletedTodosMessage />
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

export { createTodoSamples };
export type { Todo };
