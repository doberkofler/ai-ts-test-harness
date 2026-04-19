export const html03NavigationWithDropdownMenus = (): string => {
	return `
		<nav class="site-nav" aria-label="Main navigation">
			<ul class="top-level-menu">
				<li>
					<button class="menu-trigger" aria-haspopup="true" aria-expanded="false">Products</button>
					<ul class="dropdown-menu">
						<li><a href="/products/new" role="menuitem" tabindex="0">New arrivals</a></li>
						<li><a href="/products/popular" role="menuitem" tabindex="-1">Popular</a></li>
						<li><a href="/products/sale" role="menuitem" tabindex="-1">Sale</a></li>
					</ul>
				</li>
				<li>
					<button class="menu-trigger" aria-haspopup="true" aria-expanded="false">Solutions</button>
					<ul class="dropdown-menu">
						<li><a href="/solutions/startups" role="menuitem" tabindex="0">Startups</a></li>
						<li><a href="/solutions/enterprise" role="menuitem" tabindex="-1">Enterprise</a></li>
						<li><a href="/solutions/nonprofit" role="menuitem" tabindex="-1">Nonprofit</a></li>
					</ul>
				</li>
				<li>
					<button class="menu-trigger" aria-haspopup="true" aria-expanded="false">Company</button>
					<ul class="dropdown-menu">
						<li><a href="/company/about" role="menuitem" tabindex="0">About</a></li>
						<li><a href="/company/careers" role="menuitem" tabindex="-1">Careers</a></li>
						<li><a href="/company/contact" role="menuitem" tabindex="-1">Contact</a></li>
					</ul>
				</li>
			</ul>
		</nav>

		<script>
			const triggers = Array.from(document.querySelectorAll('.menu-trigger'));
			for (const trigger of triggers) {
				trigger.addEventListener('keydown', (event) => {
					if (!(event instanceof KeyboardEvent)) {
						return;
					}

					const parent = trigger.parentElement;
					const menu = parent?.querySelector('.dropdown-menu');
					const items = menu ? Array.from(menu.querySelectorAll('[role="menuitem"]')) : [];
					if (items.length === 0) {
						return;
					}

					if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
						event.preventDefault();
						items[0]?.focus();
					}

					if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
						event.preventDefault();
						items[items.length - 1]?.focus();
					}
				});
			}
		</script>
	`;
};
