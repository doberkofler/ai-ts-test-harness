import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'safe-json-parse',
	description: ['Safely parse JSON text into unknown.', 'Return null for invalid JSON input.'],
	signature: 'function safeJsonParse(input: string): unknown',
	solution: function safeJsonParse(input: string): unknown {
		try {
			return JSON.parse(input);
		} catch {
			return null;
		}
	},
	tests: ({assert, implementation}) => {
		assert.deepStrictEqual(implementation('{"a":1,"b":true}'), {a: 1, b: true});
		assert.deepStrictEqual(implementation('[1,2,3]'), [1, 2, 3]);
		assert.strictEqual(implementation('null'), null);
		assert.strictEqual(implementation('{bad json}'), null);
	},
});
