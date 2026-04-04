import {
	type ContextProvider,
	RadiantComponent,
	RadiantElement,
	consumeContext,
	contextSelector,
	createContext,
	customElement,
	onEvent,
	prop,
	provideContext,
	query,
} from '@ecopages/radiant';

import { NoCompletedTodosMessage, NoTodosMessage, TodoList } from './radiant-todo.templates';

export type RadiantTodoProps = {
	complete?: boolean;
};

export type RadiantTodoAppProps = {
	initialTodos?: Todo[] | string;
};

export type Todo = {
	id: string;
	text: string;
	complete: boolean;
};

export type TodoContext = {
	todos: Todo[];
	logger: Logger;
};

export const todoContext = createContext<TodoContext>(Symbol('todo-context'));

class Logger {
	log(message: string) {
		console.log('%cLOGGER', 'background: #222; color: #bada55', message);
	}
}

@customElement('radiant-todo-item')
export class RadiantTodoItem extends RadiantElement {
	@query({ selector: 'input[type="checkbox"]' }) checkbox!: HTMLInputElement;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) complete!: boolean;
	@consumeContext(todoContext) context!: ContextProvider<typeof todoContext>;

	override connectedCallback(): void {
		super.connectedCallback();
		this.complete = this.checkbox.checked;
	}

	@onEvent({ selector: 'input[type="checkbox"]', type: 'change' })
	toggleComplete(event: Event) {
		const checkbox = event.target as HTMLInputElement;
		const todo = this.context.getContext().todos.find((t) => t.id === this.id);
		if (!todo) return;

		this.complete = checkbox.checked;

		this.context.setContext({
			todos: this.context
				.getContext()
				.todos.map((t) => (t.id === this.id ? { ...t, complete: checkbox.checked } : t)),
		});

		const logger = this.context.getContext().logger;
		logger.log(`Todo ${this.id} is now ${checkbox.checked ? 'complete' : 'incomplete'}`);
	}

	@onEvent({ ref: 'remove-todo', type: 'click' })
	removeTodo() {
		this.context.setContext({
			todos: this.context.getContext().todos.filter((t) => t.id !== this.id),
		});

		const logger = this.context.getContext().logger;
		logger.log(`Todo ${this.id} removed`);
	}
}

@customElement('radiant-todo-app')
export class RadiantTodoApp extends RadiantComponent {
	@prop({ type: Array, defaultValue: [] }) initialTodos!: Todo[];

	@provideContext<typeof todoContext>({
		context: todoContext,
		initialValue: { todos: [], logger: new Logger() },
		hydrate: Object,
	})
	provider!: ContextProvider<typeof todoContext>;

	private didInitializeTodos = false;

	override connectedCallback(): void {
		if (!this.didInitializeTodos) {
			this.didInitializeTodos = true;

			if (this.initialTodos.length > 0) {
				this.provider.setContext({ todos: this.initialTodos });
			}
		}

		super.connectedCallback();
	}

	@onEvent({ selector: 'form', type: 'submit' })
	submitTodo(event: FormDataEvent) {
		event.preventDefault();
		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		const todo = formData.get('todo');

		if (todo) {
			const prevTodos = this.provider.getContext().todos;
			const todos = [...prevTodos, { id: Date.now().toString(), text: todo.toString(), complete: false }];
			this.provider.setContext({ todos });
			form.reset();
		}
	}

	@contextSelector({ context: todoContext, select: ({ todos }) => todos })
	todos: Todo[] = [];

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

declare global {}
