import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'camel-case-split-regexp',
	description: [
		'Return a zero-width RegExp suitable for splitting camelCase and acronym boundaries.',
		'Keep consecutive capitals together unless followed by lowercase.',
	],
	signature: 'function camelCaseSplitRegexp(): RegExp',
	solution: function camelCaseSplitRegexp(): RegExp {
		return /(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/;
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		assert.deepStrictEqual('camelCaseString'.split(regexp), ['camel', 'Case', 'String']);
		assert.deepStrictEqual('XMLParser'.split(regexp), ['XML', 'Parser']);
		assert.deepStrictEqual('getHTTPResponse'.split(regexp), ['get', 'HTTP', 'Response']);
	},
});
