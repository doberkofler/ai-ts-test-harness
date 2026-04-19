export const html10SearchFormWithAutocomplete = (): string => {
	return `
		<form class="search-form" action="/search" method="get">
			<label for="site-search">Search documentation</label>
			<div class="combobox-wrapper" role="combobox" aria-haspopup="listbox" aria-owns="search-results-listbox">
				<input
					id="site-search"
					name="q"
					type="search"
					aria-autocomplete="list"
					aria-controls="search-results-listbox"
					aria-expanded="false"
					aria-activedescendant=""
				/>
			</div>
			<ul id="search-results-listbox" role="listbox"></ul>
			<p id="search-live-status" aria-live="polite"></p>
		</form>

		<script>
			const input = document.getElementById('site-search');
			const listbox = document.getElementById('search-results-listbox');
			const liveStatus = document.getElementById('search-live-status');
			const suggestions = ['accessibility', 'aria attributes', 'async rendering', 'article semantics'];
			let activeIndex = -1;

			if (!(input instanceof HTMLInputElement) || !(listbox instanceof HTMLUListElement) || !(liveStatus instanceof HTMLParagraphElement)) {
				throw new TypeError('Autocomplete wiring failed');
			}

			const renderOptions = (items) => {
				listbox.innerHTML = '';
				for (let index = 0; index < items.length; index += 1) {
					const option = document.createElement('li');
					option.id = 'search-option-' + index;
					option.role = 'option';
					option.textContent = items[index];
					listbox.append(option);
				}
				input.setAttribute('aria-expanded', items.length > 0 ? 'true' : 'false');
				liveStatus.textContent = items.length + ' results available';
			};

			input.addEventListener('input', () => {
				activeIndex = -1;
				const query = input.value.trim().toLowerCase();
				if (query.length === 0) {
					renderOptions([]);
					input.setAttribute('aria-activedescendant', '');
					return;
				}

				const matches = suggestions.filter((value) => value.includes(query));
				renderOptions(matches);
				input.setAttribute('aria-activedescendant', '');
			});

			input.addEventListener('keydown', (event) => {
				const options = Array.from(listbox.querySelectorAll('[role="option"]'));
				if (options.length === 0) {
					return;
				}

				if (event.key === 'ArrowDown') {
					event.preventDefault();
					activeIndex = (activeIndex + 1) % options.length;
				}

				if (event.key === 'ArrowUp') {
					event.preventDefault();
					activeIndex = (activeIndex - 1 + options.length) % options.length;
				}

				if (activeIndex >= 0) {
					const activeOption = options[activeIndex];
					if (activeOption) {
						input.setAttribute('aria-activedescendant', activeOption.id);
					}
				}
			});
		</script>
	`;
};
