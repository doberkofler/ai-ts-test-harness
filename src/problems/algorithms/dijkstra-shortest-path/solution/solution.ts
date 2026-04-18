type Edge = readonly [from: number, to: number, weight: number];

const __legacySolution = (function dijkstraShortestPath(nodeCount: number, edges: readonly Edge[], start: number, end: number): number | null {
		if (nodeCount <= 0 || start < 0 || end < 0 || start >= nodeCount || end >= nodeCount) {
			return null;
		}

		const adjacency = Array.from({length: nodeCount}, () => [] as {to: number; weight: number}[]);
		const adjacencyAt = (index: number): {to: number; weight: number}[] => {
			const bucket = adjacency[index];
			if (!bucket) {
				throw new Error(`invalid adjacency index ${index}`);
			}
			return bucket;
		};

		for (const [from, to, weight] of edges) {
			if (from < 0 || from >= nodeCount || to < 0 || to >= nodeCount) {
				continue;
			}
			const bucket = adjacencyAt(from);
			bucket.push({to, weight});
		}

		const distances = Array.from({length: nodeCount}, () => Number.POSITIVE_INFINITY);
		const visited = Array.from({length: nodeCount}, () => false);
		distances[start] = 0;

		for (let i = 0; i < nodeCount; i++) {
			let current = -1;
			let best = Number.POSITIVE_INFINITY;

			for (let node = 0; node < nodeCount; node++) {
				const isVisited = visited[node];
				const nodeDistance = distances[node];
				if (isVisited === true || typeof nodeDistance !== 'number') {
					continue;
				}

				if (nodeDistance < best) {
					best = nodeDistance;
					current = node;
				}
			}

			if (current === -1 || !Number.isFinite(best)) {
				break;
			}

			if (current === end) {
				const endDistance = distances[end];
				if (typeof endDistance !== 'number') {
					return null;
				}
				return endDistance;
			}

			visited[current] = true;
			const neighbors = adjacencyAt(current);

			for (const edge of neighbors) {
				if (visited[edge.to] === true) {
					continue;
				}
				const candidate = best + edge.weight;
				const previousDistance = distances[edge.to];
				if (typeof previousDistance !== 'number') {
					continue;
				}

				if (candidate < previousDistance) {
					distances[edge.to] = candidate;
				}
			}
		}

		const answer = distances[end];
		if (answer === undefined || !Number.isFinite(answer)) {
			return null;
		}

		return answer;
	});
export const dijkstraShortestPath = __legacySolution;
