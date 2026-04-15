import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'balanced-tag-named-backreference',
	description: ['Return a RegExp that enforces matching opening and closing tag names.', 'Use a named backreference for the closing tag.'],
	signature: 'function balancedTagNamedBackreference(): RegExp',
	solution: function balancedTagNamedBackreference(): RegExp {
		return /^<(?<name>[a-z][\w-]*)>.*<\/\k<name>>$/is;
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		assert.strictEqual(regexp.test('<div>content</div>'), true);
		assert.strictEqual(regexp.test('<span>hello</span>'), true);
		assert.strictEqual(regexp.test('<custom-element>data</custom-element>'), true);
		assert.strictEqual(regexp.test('<div>content</span>'), false);
		assert.strictEqual(regexp.test('<p>unclosed'), false);
	},
});
