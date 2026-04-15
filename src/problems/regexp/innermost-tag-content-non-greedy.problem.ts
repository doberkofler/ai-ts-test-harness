import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'innermost-tag-content-non-greedy',
	description: ['Return a RegExp that extracts innermost nested tag content using non-greedy matching.', 'Assume one outer tag wrapping one inner tag.'],
	signature: 'function innermostTagContentNonGreedy(): RegExp',
	solution: function innermostTagContentNonGreedy(): RegExp {
		return /^<[a-z][\w-]*><[a-z][\w-]*>(.*?)<\/[a-z][\w-]*><\/[a-z][\w-]*>$/i;
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		const a = regexp.exec('<b><i>hello</i></b>');
		assert.ok(a !== null);
		if (a === null) {
			return;
		}
		assert.strictEqual(a[1], 'hello');

		const b = regexp.exec('<span><em>world</em></span>');
		assert.ok(b !== null);
		if (b === null) {
			return;
		}
		assert.strictEqual(b[1], 'world');

		assert.strictEqual(regexp.exec('<p>no inner</p>'), null);
	},
});
