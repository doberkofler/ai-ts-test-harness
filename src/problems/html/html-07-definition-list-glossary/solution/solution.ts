export const html07DefinitionListGlossary = (): string => {
	return `
		<section class="glossary" aria-labelledby="glossary-heading">
			<h2 id="glossary-heading">Frontend glossary</h2>

			<nav aria-label="Glossary term links">
				<ul>
					<li><a href="#term-api"><abbr title="Application Programming Interface">API</abbr></a></li>
					<li><a href="#term-dom"><abbr title="Document Object Model">DOM</abbr></a></li>
					<li><a href="#term-lcp">LCP</a></li>
					<li><a href="#term-a11y">A11y</a></li>
					<li><a href="#term-ssr">SSR</a></li>
				</ul>
			</nav>

			<dl>
				<dt id="term-api"><abbr title="Application Programming Interface">API</abbr></dt>
				<dd>A contract that allows software systems to communicate and exchange data.</dd>
				<dt id="term-dom"><abbr title="Document Object Model">DOM</abbr></dt>
				<dd>The in-memory representation of an HTML document that scripts can inspect and modify.</dd>
				<dt id="term-lcp">LCP</dt>
				<dd>Largest Contentful Paint, a Core Web Vital focused on loading performance.</dd>
				<dt id="term-a11y">A11y</dt>
				<dd>A shorthand for accessibility practices that make interfaces usable for everyone.</dd>
				<dt id="term-ssr">SSR</dt>
				<dd>Server-side rendering, where HTML is generated on the server before reaching the browser.</dd>
			</dl>
		</section>
	`;
};
