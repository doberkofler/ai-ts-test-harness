type Graph = Record<number, number[]>;

const __legacySolution = (function detectCycleDirectedGraph(graph: Graph): boolean {
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
	});
export const detectCycleDirectedGraph = __legacySolution;
