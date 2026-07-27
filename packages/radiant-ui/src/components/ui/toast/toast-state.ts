import type { PromiseToastMessages, ToastId, ToastOptions, ToastRecord, ToastVariant } from './toast-context';

export type ToastSubscriber = (toasts: ToastRecord[]) => void;

let toastCounter = 1;

function nextId(): number {
	return toastCounter++;
}

function resolveMessage<T>(message: string | ((value: T) => string), value: T): string {
	return typeof message === 'function' ? message(value) : message;
}

class ToastState {
	private subscribers: ToastSubscriber[] = [];
	private toasts: ToastRecord[] = [];

	subscribe = (subscriber: ToastSubscriber): (() => void) => {
		this.subscribers.push(subscriber);
		subscriber(this.toasts);
		return () => {
			const index = this.subscribers.indexOf(subscriber);
			if (index >= 0) this.subscribers.splice(index, 1);
		};
	};

	getSnapshot = (): ToastRecord[] => this.toasts;

	private publish(): void {
		const snapshot = this.toasts;
		for (const subscriber of this.subscribers) {
			subscriber(snapshot);
		}
	}

	create = (title: string, options: ToastOptions & { variant?: ToastVariant } = {}): ToastId => {
		const id = options.id ?? nextId();
		const dismissible = options.dismissible ?? true;
		const existingIndex = this.toasts.findIndex((toast) => toast.id === id);

		const next: ToastRecord = {
			id,
			title,
			description: options.description,
			variant: options.variant ?? 'default',
			duration: options.duration,
			action: options.action,
			dismissible,
			closeButton: options.closeButton,
			position: options.position,
			delete: false,
		};

		if (existingIndex >= 0) {
			this.toasts = this.toasts.map((toast) => (toast.id === id ? { ...toast, ...next, delete: false } : toast));
		} else {
			this.toasts = [next, ...this.toasts];
		}

		this.publish();
		return id;
	};

	dismiss = (id?: ToastId): void => {
		if (id == null) {
			if (this.toasts.length === 0) return;
			this.toasts = this.toasts.map((toast) => ({ ...toast, delete: true }));
		} else {
			const target = this.toasts.find((toast) => toast.id === id);
			if (!target || target.delete) return;
			this.toasts = this.toasts.map((toast) => (toast.id === id ? { ...toast, delete: true } : toast));
		}
		this.publish();
	};

	remove = (id: ToastId): void => {
		this.toasts = this.toasts.filter((toast) => toast.id !== id);
		this.publish();
	};

	/** Drop every toast from the store (tests, Storybook resets). */
	clear = (): void => {
		if (this.toasts.length === 0) return;
		this.toasts = [];
		this.publish();
	};

	message = (title: string, options?: ToastOptions): ToastId => this.create(title, options);

	success = (title: string, options?: ToastOptions): ToastId =>
		this.create(title, { ...options, variant: 'success' });

	error = (title: string, options?: ToastOptions): ToastId => this.create(title, { ...options, variant: 'error' });

	info = (title: string, options?: ToastOptions): ToastId => this.create(title, { ...options, variant: 'info' });

	warning = (title: string, options?: ToastOptions): ToastId =>
		this.create(title, { ...options, variant: 'warning' });

	loading = (title: string, options?: ToastOptions): ToastId =>
		this.create(title, { ...options, variant: 'loading', duration: options?.duration ?? Number.POSITIVE_INFINITY });

	promise = <T>(promise: Promise<T> | (() => Promise<T>), messages: PromiseToastMessages<T>): ToastId => {
		const id = this.loading(messages.loading, {
			duration: Number.POSITIVE_INFINITY,
			action: messages.action,
			closeButton: messages.closeButton,
			position: messages.position,
			description: typeof messages.description === 'string' ? messages.description : undefined,
		});

		const pending = typeof promise === 'function' ? promise() : promise;

		pending
			.then((data) => {
				const description =
					typeof messages.description === 'function' ? messages.description(data) : messages.description;
				this.create(resolveMessage(messages.success, data), {
					id,
					variant: 'success',
					description,
					duration: messages.duration,
					action: messages.action,
					closeButton: messages.closeButton,
					position: messages.position,
				});
			})
			.catch((error: unknown) => {
				const description =
					typeof messages.description === 'function' ? messages.description(error) : messages.description;
				this.create(resolveMessage(messages.error, error), {
					id,
					variant: 'error',
					description,
					duration: messages.duration,
					action: messages.action,
					closeButton: messages.closeButton,
					position: messages.position,
				});
			});

		return id;
	};
}

export const toastState = new ToastState();
