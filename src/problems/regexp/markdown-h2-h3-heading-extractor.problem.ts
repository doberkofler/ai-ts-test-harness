import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'markdown-h2-h3-heading-extractor',
	description: [
		'Return a global multiline RegExp to extract heading text for markdown ## and ### headings only.',
		'Do not match # headings or #### and deeper headings.',
	],
	signature: 'function markdownH2H3HeadingExtractor(): RegExp',
	solution: function markdownH2H3HeadingExtractor(): RegExp {
		return /^(?:##|###)\s([^\n]+)$/gm;
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		const md = `# Title
## Section One
### Subsection A
#### Too deep
## Section Two
#Not a heading`;

		const headings = [...md.matchAll(regexp)].map((m) => m[1]);
		assert.deepStrictEqual(headings, ['Section One', 'Subsection A', 'Section Two']);
	},
});
