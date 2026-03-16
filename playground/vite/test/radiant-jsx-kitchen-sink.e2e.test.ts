import '../src/components/radiant-jsx-kitchen-sink/radiant-jsx-kitchen-sink.script';
import { describe, expect, test } from 'vitest';

const waitFor = async (assertion: () => void, timeout = 2_000) => {
	const startedAt = Date.now();
	let lastError: unknown;

	while (Date.now() - startedAt < timeout) {
		try {
			assertion();
			return;
		} catch (error) {
			lastError = error;
			await new Promise((resolve) => window.setTimeout(resolve, 16));
		}
	}

	throw lastError instanceof Error ? lastError : new Error('Timed out while waiting for browser assertion.');
};

describe('playground kitchen sink', () => {
	test('publishes and resets the local note draft against committed context', async () => {
		document.body.innerHTML =
			'<radiant-jsx-kitchen-sink heading="Kitchen sink for the new JSX runtime" count="3"></radiant-jsx-kitchen-sink>';

		await customElements.whenDefined('radiant-jsx-kitchen-sink');
		await customElements.whenDefined('radiant-jsx-sink-note-editor');
		await customElements.whenDefined('radiant-jsx-sink-inspector');

		await waitFor(() => {
			expect(document.querySelector('radiant-jsx-sink-note-editor [data-ref="note-input"]')).toBeTruthy();
			expect(document.querySelector('radiant-jsx-sink-inspector [data-ref="committed-note"]')).toBeTruthy();
		});

		const getNoteInput = () => {
			const input = document.querySelector('radiant-jsx-sink-note-editor [data-ref="note-input"]');
			expect(input).toBeInstanceOf(HTMLInputElement);
			return input as HTMLInputElement;
		};

		const getPublishButton = () => {
			const button = document.querySelector('radiant-jsx-sink-note-editor [data-ref="publish-note"]');
			expect(button).toBeInstanceOf(HTMLButtonElement);
			return button as HTMLButtonElement;
		};

		const getResetButton = () => {
			const button = document.querySelector('radiant-jsx-sink-note-editor [data-ref="reset-note"]');
			expect(button).toBeInstanceOf(HTMLButtonElement);
			return button as HTMLButtonElement;
		};

		const getCommittedNote = () => {
			const note = document.querySelector('radiant-jsx-sink-inspector [data-ref="committed-note"]');
			expect(note).toBeInstanceOf(HTMLElement);
			return note as HTMLElement;
		};

		const committedValue = 'Ship the connected sink.';
		let noteInput = getNoteInput();
		noteInput.focus();
		noteInput.value = committedValue;
		noteInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

		getPublishButton().click();

		await waitFor(() => {
			expect(getCommittedNote().textContent?.trim()).toBe(committedValue);
			expect(getNoteInput().value).toBe(committedValue);
		});

		noteInput = getNoteInput();
		noteInput.focus();
		noteInput.value = 'Unsaved local edit';
		noteInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
		expect(getNoteInput().value).toBe('Unsaved local edit');

		getResetButton().click();

		await waitFor(() => {
			expect(getNoteInput().value).toBe(committedValue);
			expect(getCommittedNote().textContent?.trim()).toBe(committedValue);
		});
	});
});
