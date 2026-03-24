/** @jsxImportSource @ecopages/jsx */

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

export type RadiantTodoProps = {
	complete?: boolean;
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

@customElement('radiant-todo-item')
export class RadiantTodoItem extends RadiantElement {
	@query({ selector: 'input[type="checkbox"]' }) checkbox!: HTMLInputElement;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) declare complete: boolean;
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
	@provideContext<typeof todoContext>({
		context: todoContext,
		initialValue: { todos: [], logger: new Logger() },
		hydrate: Object,
	})
	provider!: ContextProvider<typeof todoContext>;

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

	@contextSelector({
		context: todoContext,
	})
	onTodosUpdated() {
		this.update();
	}

	override render() {
		const todos = this.provider?.getContext().todos ?? [];
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
							{todosCompleted.length > 0 ? <TodoList todos={todosCompleted} /> : <NoCompletedTodosMessage />}
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
