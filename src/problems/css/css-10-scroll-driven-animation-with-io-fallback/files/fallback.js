const observer = new IntersectionObserver(
	(entries) => {
		for (const entry of entries) {
			entry.target.classList.toggle('is-visible', entry.isIntersecting);
		}
	},
	{threshold: 0.2},
);

for (const element of document.querySelectorAll('.animate-on-scroll')) {
	observer.observe(element);
}
