export const html06DialogModal = (): string => {
	return `
		<button id="open-dialog" class="dialog-open-button">Open settings</button>

		<dialog id="settings-dialog" aria-labelledby="dialog-title" aria-describedby="dialog-description">
			<h2 id="dialog-title">Account settings</h2>
			<p id="dialog-description">Update your notification and profile preferences.</p>
			<form method="dialog" class="dialog-content">
				<label for="email-alerts">Email alerts</label>
				<input id="email-alerts" type="checkbox" />
				<button id="save-dialog" type="submit">Save</button>
				<button id="close-dialog" type="button" aria-label="Close dialog">Close</button>
			</form>
		</dialog>

		<script>
			const openButton = document.getElementById('open-dialog');
			const closeButton = document.getElementById('close-dialog');
			const dialog = document.getElementById('settings-dialog');

			if (!(dialog instanceof HTMLDialogElement) || !(openButton instanceof HTMLButtonElement) || !(closeButton instanceof HTMLButtonElement)) {
				throw new TypeError('Dialog wiring failed');
			}

			const getFocusableElements = () =>
				Array.from(dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));

			openButton.addEventListener('click', () => {
				dialog.showModal();
				const focusable = getFocusableElements();
				focusable[0]?.focus();
			});

			closeButton.addEventListener('click', () => {
				dialog.close();
				openButton.focus();
			});

			dialog.addEventListener('keydown', (event) => {
				if (!(event instanceof KeyboardEvent)) {
					return;
				}

				if (event.key === 'Escape') {
					dialog.close();
					openButton.focus();
					return;
				}

				if (event.key !== 'Tab') {
					return;
				}

				const focusable = getFocusableElements();
				if (focusable.length === 0) {
					return;
				}

				const first = focusable[0];
				const last = focusable[focusable.length - 1];
				const active = document.activeElement;

				if (event.shiftKey && active === first) {
					event.preventDefault();
					last?.focus();
					return;
				}

				if (!event.shiftKey && active === last) {
					event.preventDefault();
					first?.focus();
				}
			});

			dialog.addEventListener('click', (event) => {
				if (event.target === dialog) {
					dialog.close();
					openButton.focus();
				}
			});
		</script>
	`;
};
