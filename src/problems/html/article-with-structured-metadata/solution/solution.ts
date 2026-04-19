export const html04ArticleWithStructuredMetadata = (): string => {
	return `
		<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>Building Accessible Interfaces with Semantic HTML</title>
				<meta property="og:title" content="Building Accessible Interfaces with Semantic HTML" />
				<meta property="og:description" content="Practical techniques for shipping semantic and accessible HTML at scale." />
				<meta property="og:image" content="https://example.com/images/accessible-html-hero.jpg" />
				<meta property="og:type" content="article" />
			</head>
			<body>
				<article class="post">
					<header>
						<h1>Building Accessible Interfaces with Semantic HTML</h1>
						<p>
							Published <time datetime="2024-11-15">November 15, 2024</time>
						</p>
						<address>
							By <a href="https://example.com/authors/alex-porter">Alex Porter</a><br />
							Semantic Labs, 101 Web Way, Austin, TX
						</address>
					</header>

					<figure>
						<img src="https://example.com/images/hero-placeholder.jpg" alt="Developer reviewing semantic HTML landmarks in browser devtools" />
						<figcaption>Auditing landmark regions in a production page before release.</figcaption>
					</figure>

					<p>Semantic markup improves interoperability with assistive technologies and clarifies document intent.</p>
					<p>Combining native elements with structured metadata supports discoverability and consistent indexing.</p>

					<footer>
						<p>Filed under Accessibility, HTML, and Web Standards.</p>
					</footer>
				</article>

				<script type="application/ld+json">
					{
						"@context": "https://schema.org",
						"@type": "Article",
						"headline": "Building Accessible Interfaces with Semantic HTML",
						"datePublished": "2024-11-15",
						"author": {
							"@type": "Person",
							"name": "Alex Porter"
						},
						"image": "https://example.com/images/accessible-html-hero.jpg",
						"description": "Practical techniques for shipping semantic and accessible HTML at scale."
					}
				</script>
			</body>
		</html>
	`;
};
