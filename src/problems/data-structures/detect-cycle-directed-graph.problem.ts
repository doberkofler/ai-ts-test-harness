import {defineImplementProblem} from '#problem-api';

type Graph = Record<number, number[]>;

export default defineImplementProblem({
	name: 'detect-cycle-directed-graph',
	description: 'Detect whether a directed graph contains a cycle.',
	signature: 'function detectCycleDirectedGraph(graph: Record<number, number[]>): boolean',
	solution: function detectCycleDirectedGraph(graph: Graph): boolean {
		const visiting = new Set<number>();
		const visited = new Set<number>();

		const visit = (node: number): boolean => {
			if (visiting.has(node)) {
				return true;
			}
			if (visited.has(node)) {
				return false;
			}

			visiting.add(node);
			for (const next of graph[node] ?? []) {
				if (visit(next)) {
					return true;
				}
			}
			visiting.delete(node);
			visited.add(node);
			return false;
		};

		const keys = Object.keys(graph).map(Number);
		for (const key of keys) {
			if (visit(key)) {
				return true;
			}
		}

		return false;
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(
			implementation({
				0: [1],
				1: [2],
				2: [0],
			}),
			true,
		);
		assert.strictEqual(
			implementation({
				0: [1, 2],
				1: [3],
				2: [],
				3: [],
			}),
			false,
		);
		assert.strictEqual(
			implementation({
				1: [2],
				2: [3],
				3: [4],
				4: [2],
			}),
			true,
		);
	},
});
